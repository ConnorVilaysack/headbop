const KIE_LYRICS_URL = "https://api.kie.ai/api/v1/lyrics";
const KIE_LYRICS_INFO_URL = "https://api.kie.ai/api/v1/lyrics/record-info";

/** KIE lyrics prompt max length (API: ~200 characters). */
export const KIE_LYRICS_PROMPT_MAX = 200;

function normalizeKeyPoints(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-*•]\s+/, ""))
    .filter(Boolean)
    .slice(0, 6);
}

/** Prefer longer, structurally complete lyric sets (API often returns 2–3 variations). */
export function scoreLyricsCompleteness(text: string): number {
  const t = text.trim();
  let s = t.length * 3;
  if (/\[outro\]/i.test(t)) s += 12_000;
  if (/\[chorus\]/i.test(t)) s += 800;
  if (/\[verse\s*2\]/i.test(t) || /\[verse 2\]/i.test(t)) s += 400;
  if (/\[bridge\]/i.test(t)) s += 600;
  if (/\[verse\s*3\]/i.test(t)) s += 300;
  if (/\[intro\]/i.test(t)) s += 200;
  const lastSection = (t.match(/\[([^\]]+)\]\s*$/im)?.[1] ?? "").toLowerCase();
  if (lastSection.includes("bridge") && !/\[outro\]/i.test(t)) s -= 6000;
  if (lastSection.includes("verse") && !/\[chorus\]/i.test(t)) s -= 2000;
  return s;
}

export function pickBestLyricsVariation(
  items: Array<{
    text?: string;
    title?: string;
    status?: string;
  }>
): { text: string; suggestedTitle?: string } | null {
  const completes = items.filter(
    (x) => x.status === "complete" && x.text && x.text.trim().length > 0
  );
  if (completes.length === 0) return null;
  let best = completes[0];
  let bestScore = scoreLyricsCompleteness(best.text!);
  for (let i = 1; i < completes.length; i++) {
    const sc = scoreLyricsCompleteness(completes[i].text!);
    if (sc > bestScore) {
      best = completes[i];
      bestScore = sc;
    }
  }
  return {
    text: best.text!.trim(),
    suggestedTitle: best.title?.trim(),
  };
}

/** Heuristic: model output often stops after [Bridge] with no [Outro]. */
export function isLyricsLikelyIncomplete(text: string): boolean {
  const t = text.trim();
  if (t.length < 320) return true;
  if (!/\[outro\]/i.test(t)) return true;
  return false;
}

/**
 * Second attempt: minimal theme, strong “finish the arc” instruction (still ≤200 chars).
 */
export function buildLyricsRetryPrompt(opts: {
  styleLabel: string;
  subject: string;
  referenceStyle: string;
}): string {
  const ref = opts.referenceStyle?.trim();
  const s = ref
    ? `${opts.styleLabel} about ${opts.subject}. ${ref}. Full song with [Outro]—do not end at bridge.`
    : `${opts.styleLabel} about ${opts.subject}. Full song with [Outro]—do not end at bridge.`;
  return s.slice(0, KIE_LYRICS_PROMPT_MAX);
}

/**
 * Compact prompt for /api/v1/lyrics — must stay within character budget.
 */
export function buildLyricsApiPrompt(opts: {
  styleLabel: string;
  subject: string;
  keyPoints: string;
  referenceStyle: string;
}): string {
  const points = normalizeKeyPoints(opts.keyPoints);
  const gist = points.join("; ") || opts.keyPoints.trim().slice(0, 80);
  const structure = "V,C,Br,C,Out";
  const ref = opts.referenceStyle?.trim();
  const prefix = ref
    ? `${opts.styleLabel} ${structure} about ${opts.subject}. ${ref}. `
    : `${opts.styleLabel} ${structure} about ${opts.subject}. `;
  let body = gist;
  let out = prefix + body;
  if (out.length <= KIE_LYRICS_PROMPT_MAX) return out;
  const room = KIE_LYRICS_PROMPT_MAX - prefix.length;
  if (room < 10) {
    return prefix.slice(0, KIE_LYRICS_PROMPT_MAX);
  }
  body = gist.slice(0, room - 3) + "...";
  return (prefix + body).slice(0, KIE_LYRICS_PROMPT_MAX);
}

export async function startLyricsTask(opts: {
  apiKey: string;
  prompt: string;
  callBackUrl: string;
}): Promise<string> {
  const res = await fetch(KIE_LYRICS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      prompt: opts.prompt,
      callBackUrl: opts.callBackUrl,
    }),
  });
  const json = (await res.json()) as {
    code?: number;
    msg?: string;
    data?: { taskId?: string };
  };
  if (json.code !== 200 || !json.data?.taskId) {
    throw new Error(json.msg || "Failed to start lyrics generation");
  }
  return json.data.taskId;
}

export async function waitForLyricsResult(opts: {
  apiKey: string;
  taskId: string;
  maxAttempts?: number;
  intervalMs?: number;
}): Promise<{ text: string; suggestedTitle?: string }> {
  const maxAttempts = opts.maxAttempts ?? 90;
  const intervalMs = opts.intervalMs ?? 2000;

  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(
      `${KIE_LYRICS_INFO_URL}?taskId=${encodeURIComponent(opts.taskId)}`,
      {
        headers: { Authorization: `Bearer ${opts.apiKey}` },
      }
    );
    const json = (await res.json()) as {
      code?: number;
      msg?: string;
      data?: {
        status?: string;
        errorMessage?: string | null;
        response?: {
          data?: Array<{
            text?: string;
            title?: string;
            status?: string;
            errorMessage?: string;
          }>;
        };
      };
    };

    if (json.code !== 200) {
      throw new Error(json.msg || "Lyrics status request failed");
    }

    const status = json.data?.status;
    if (status === "SUCCESS") {
      const items = json.data?.response?.data ?? [];
      const picked = pickBestLyricsVariation(items);
      if (picked) return picked;
      throw new Error("Lyrics completed but no text returned");
    }

    if (status && status !== "PENDING") {
      throw new Error(
        json.data?.errorMessage || `Lyrics generation failed (${status})`
      );
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error("Lyrics generation timed out");
}

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

function compressPoint(p: string): string {
  const clean = p.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const lower = clean.toLowerCase();
  // Tiny “meaning anchors” that survive the 200-char budget better than full sentences.
  if (lower.includes("sunlight") && (lower.includes("food") || lower.includes("make"))) {
    return "sunlight→food";
  }
  if (lower.includes("water") && (lower.includes("air") || lower.includes("carbon"))) {
    return "water+CO2 energy";
  }
  if (lower.includes("sugar") && (lower.includes("grow") || lower.includes("growth"))) {
    return "make sugar grow";
  }
  if (lower.includes("oxygen") && (lower.includes("breathe") || lower.includes("breath"))) {
    return "oxygen to breathe";
  }
  if (lower.includes("healthy") || lower.includes("alive")) {
    return "keeps alive";
  }

  // Fallback: first few words.
  const words = clean.split(" ").filter(Boolean);
  const token = words.slice(0, 4).join(" ");
  return token.length > 22 ? token.slice(0, 22).trimEnd() : token;
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
  keyPoints: string;
}): string {
  const points = normalizeKeyPoints(opts.keyPoints);

  // Compress each point so the prompt can always contain the whole list
  // inside the ~200 character budget.
  const pointTokens = points.map(compressPoint).filter(Boolean);
  const pointsList = pointTokens.length
    ? pointTokens.join(", ")
    : opts.keyPoints.trim().slice(0, 60);

  const ref = opts.referenceStyle?.trim();
  // Reference style in the lyrics prompt is optional; we keep it short
  // so the model still receives the full key-point list.
  const shortRef = ref ? ref.slice(0, 40).trimEnd() : "";
  const stylePart = shortRef
    ? `${opts.styleLabel} V,C,Br,C,Out about ${opts.subject}. ${shortRef}. `
    : `${opts.styleLabel} V,C,Br,C,Out about ${opts.subject}. `;

  const tail =
    "Key points: " +
    pointsList +
    ". Lyrics must mention each point, and include [Outro] (do not end at bridge).";

  const out = (stylePart + tail).slice(0, KIE_LYRICS_PROMPT_MAX).trimEnd();
  return out;
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
  const ref = opts.referenceStyle?.trim();

  // Key points MUST dominate the 200-char budget. Style is a hint.
  const structure = "V,C,Br,C,Out";
  const pointTokens = points.map(compressPoint).filter(Boolean);
  const pointsList = pointTokens.length
    ? pointTokens.join(", ")
    : opts.keyPoints.trim().slice(0, 80);

  // Build in “layers” so we can drop style details first if we run out of room.
  const base = `${opts.styleLabel} ${structure} about ${opts.subject}. `;
  const key = `Key points: ${pointsList}. `;
  const must = "Mention EACH point clearly (kid-friendly).";

  // Optional style flavour – only include if there is room after key points.
  const refShort = ref ? ` Style: ${ref.slice(0, 40).trimEnd()}.` : "";

  let out = (base + key + must).slice(0, KIE_LYRICS_PROMPT_MAX).trimEnd();
  if (refShort) {
    const candidate = (base + key + must + refShort).slice(0, KIE_LYRICS_PROMPT_MAX).trimEnd();
    // Only use ref if it doesn't push key points off the end.
    if (candidate.includes("Key points:")) out = candidate;
  }
  return out;
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

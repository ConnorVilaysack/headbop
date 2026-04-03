import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { findArtist } from "@/lib/artist-inspirations";
import { createSong } from "@/lib/songs-store";
import { getVibeLabel } from "@/lib/vibes";
import {
  buildLyricsApiPrompt,
  buildLyricsRetryPrompt,
  isLyricsLikelyIncomplete,
  scoreLyricsCompleteness,
  startLyricsTask,
  waitForLyricsResult,
} from "@/lib/kie-lyrics";

const KIE_GENERATE_URL = "https://api.kie.ai/api/v1/generate";
// KIE docs (customMode=true, instrumental=false, model=V5):
// - prompt (lyrics) max ~5000 chars
// - style max ~1000 chars
const KIE_GENERATE_PROMPT_MAX = 5000;
const MUSIC_STYLE_MAX = 1000;

async function startAndWaitForLyrics(opts: {
  apiKey: string;
  prompt: string;
  callBackUrl: string;
  attempts?: number;
}): Promise<{ taskId: string; text: string; suggestedTitle?: string }> {
  const attempts = opts.attempts ?? 3;
  let lastErr: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const taskId = await startLyricsTask({
        apiKey: opts.apiKey,
        prompt: opts.prompt,
        callBackUrl: opts.callBackUrl,
      });
      const out = await waitForLyricsResult({
        apiKey: opts.apiKey,
        taskId,
      });
      return { taskId, ...out };
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      const transient =
        /internal error/i.test(msg) || /try again later/i.test(msg) || /maintenance/i.test(msg);
      if (!transient) break;
      // small backoff on transient KIE errors
      await new Promise((r) => setTimeout(r, 900 * Math.pow(1.7, i)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Lyrics generation failed");
}

function normalizeKeyPoints(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-*•]\s+/, ""))
    .filter(Boolean)
    .slice(0, 10);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      subject,
      keyPoints,
      style,
      vocalGender,
      artistId,
      customVibe,
    } = body;

    if (!subject || !keyPoints || !style) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const isCustom = Boolean(customVibe);

    if (!isCustom && !artistId) {
      return NextResponse.json(
        { error: "Missing required fields (including inspiration)" },
        { status: 400 }
      );
    }

    let artist: ReturnType<typeof findArtist> = undefined;
    if (!isCustom) {
      artist = findArtist(style, artistId);
      if (!artist) {
        return NextResponse.json(
          { error: "Invalid inspiration for this vibe" },
          { status: 400 }
        );
      }
    }

    const apiKey = process.env.KIE_API_KEY;
    if (!apiKey || apiKey === "your-kie-api-key-here") {
      return NextResponse.json(
        { error: "KIE API key not configured. Add your key to .env" },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const musicCallbackUrl = `${baseUrl}/api/callback`;
    const lyricsCallbackUrl = `${baseUrl}/api/callback/lyrics`;

    const usedPoints = normalizeKeyPoints(keyPoints);

    const rawCustom = isCustom ? String(style).trim() : "";
    if (isCustom && !rawCustom) {
      return NextResponse.json(
        { error: "Custom style description is empty" },
        { status: 400 }
      );
    }

    const styleLabel = getVibeLabel(style);

    const customGenreHint = isCustom
      ? (() => {
          const first = rawCustom.split(",")[0]?.trim();
          // keep it very short so key points fit in the 200-char lyrics prompt
          return (first && first.length > 0 ? first : "Folk-pop").slice(0, 18);
        })()
      : "";

    const lyricsPrompt = isCustom
      ? buildLyricsApiPrompt({
          // In custom mode, don't let the user's long style paragraph eat the 200-char lyrics budget.
          // Keep styleLabel short and push lesson points into the prompt.
          styleLabel: `${customGenreHint} classroom song`,
          subject,
          keyPoints,
          // Style prose belongs in /generate `style` (1000 char budget), not the /lyrics prompt.
          referenceStyle: "",
        })
      : buildLyricsApiPrompt({
          styleLabel,
          subject,
          keyPoints,
          referenceStyle: artist!.referenceStyle,
        });

    const firstLyrics = await startAndWaitForLyrics({
      apiKey,
      prompt: lyricsPrompt,
      callBackUrl: lyricsCallbackUrl,
      attempts: 5,
    });

    let lyricsText = firstLyrics.text;
    let suggestedTitle = firstLyrics.suggestedTitle;
    let winningLyricsTaskId = firstLyrics.taskId;

    if (isLyricsLikelyIncomplete(lyricsText)) {
      const retryPrompt = isCustom
        ? buildLyricsRetryPrompt({
            styleLabel: `${customGenreHint} classroom song`,
            subject,
            referenceStyle: "",
            keyPoints,
          })
        : buildLyricsRetryPrompt({
            styleLabel,
            subject,
            referenceStyle: artist!.referenceStyle,
            keyPoints,
          });
      const second = await startAndWaitForLyrics({
        apiKey,
        prompt: retryPrompt,
        callBackUrl: lyricsCallbackUrl,
        attempts: 4,
      });
      if (scoreLyricsCompleteness(second.text) > scoreLyricsCompleteness(lyricsText)) {
        lyricsText = second.text;
        suggestedTitle = second.suggestedTitle;
        winningLyricsTaskId = second.taskId;
      }
    }

    const musicStyle = isCustom
      ? rawCustom.slice(0, MUSIC_STYLE_MAX)
      : `${styleLabel}, ${artist!.referenceStyle}`.slice(0, MUSIC_STYLE_MAX);

    const finalTitle =
      (suggestedTitle && suggestedTitle.trim().length > 0
        ? suggestedTitle.trim()
        : "New classroom song").slice(0, 80);

    const kiePayload: Record<string, unknown> = {
      // In custom mode, KIE uses `prompt` as the exact lyrics to sing.
      // Keep within the documented max to avoid server-side truncation mid-verse.
      prompt: lyricsText.slice(0, KIE_GENERATE_PROMPT_MAX).trimEnd(),
      style: musicStyle,
      title: finalTitle,
      customMode: true,
      instrumental: false,
      model: "V5",
      callBackUrl: musicCallbackUrl,
      styleWeight: 0.85,
      weirdnessConstraint: 0.35,
      audioWeight: 0.65,
    };

    let vg: "m" | "f" | undefined;
    if (vocalGender === "m" || vocalGender === "f") vg = vocalGender;
    else if (!isCustom && artist?.suggestedVocal) vg = artist.suggestedVocal;
    if (vg) kiePayload.vocalGender = vg;

    const kieResponse = await fetch(KIE_GENERATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(kiePayload),
    });

    const kieData = await kieResponse.json();

    if (kieData.code !== 200) {
      return NextResponse.json(
        { error: kieData.msg || "Music generation failed" },
        { status: 500 }
      );
    }

    const taskId = kieData.data?.taskId as string | undefined;
    if (!taskId || typeof taskId !== "string") {
      return NextResponse.json(
        { error: "Music API did not return a taskId; cannot track this song." },
        { status: 502 }
      );
    }

    const song = await createSong({
      userId: user.id,
      title: finalTitle,
      subject,
      keyPoints,
      style,
      artistInspiration: isCustom ? null : artist!.title,
      prompt: lyricsText,
      taskId,
      status: "generating",
    });

    const requestPreview = {
      model: kiePayload.model,
      customMode: kiePayload.customMode,
      instrumental: kiePayload.instrumental,
      title: kiePayload.title,
      style: kiePayload.style,
      vocalGender: kiePayload.vocalGender ?? null,
      styleWeight: kiePayload.styleWeight,
      weirdnessConstraint: kiePayload.weirdnessConstraint,
      audioWeight: kiePayload.audioWeight,
      musicCallBackUrl: kiePayload.callBackUrl,
      lyricsPrompt,
      lyricsTaskId: winningLyricsTaskId,
      lyricsSuggestedTitle: suggestedTitle ?? null,
      lyricsPreview: lyricsText.slice(0, 1200),
      usedPoints,
      artistTitle: isCustom ? "Custom style" : artist!.title,
      referenceStyle: isCustom ? rawCustom : artist!.referenceStyle,
    };

    return NextResponse.json({ song, taskId, requestPreview });
  } catch (error) {
    console.error("Generate error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const isTransientKie =
      /internal error/i.test(message) ||
      /try again later/i.test(message) ||
      /maintenance/i.test(message) ||
      /rate/i.test(message);

    return NextResponse.json(
      {
        error: isTransientKie
          ? "KIE lyrics service is temporarily unavailable. Please try again in a moment."
          : message,
      },
      { status: isTransientKie ? 502 : 500 }
    );
  }
}

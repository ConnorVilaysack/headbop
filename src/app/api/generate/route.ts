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
const MUSIC_STYLE_MAX = 1000;

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
    const { title, subject, keyPoints, style, vocalGender, artistId } = body;

    if (!title || !subject || !keyPoints || !style || !artistId) {
      return NextResponse.json(
        { error: "Missing required fields (including inspiration)" },
        { status: 400 }
      );
    }

    const artist = findArtist(style, artistId);
    if (!artist) {
      return NextResponse.json(
        { error: "Invalid inspiration for this vibe" },
        { status: 400 }
      );
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

    const styleLabel = getVibeLabel(style);
    const usedPoints = normalizeKeyPoints(keyPoints);

    const lyricsPrompt = buildLyricsApiPrompt({
      styleLabel,
      subject,
      keyPoints,
      referenceStyle: artist.referenceStyle,
    });

    const firstLyricsTaskId = await startLyricsTask({
      apiKey,
      prompt: lyricsPrompt,
      callBackUrl: lyricsCallbackUrl,
    });

    let { text: lyricsText, suggestedTitle } = await waitForLyricsResult({
      apiKey,
      taskId: firstLyricsTaskId,
    });

    let winningLyricsTaskId = firstLyricsTaskId;

    if (isLyricsLikelyIncomplete(lyricsText)) {
      const retryPrompt = buildLyricsRetryPrompt({
        styleLabel,
        subject,
        referenceStyle: artist.referenceStyle,
      });
      const retryTaskId = await startLyricsTask({
        apiKey,
        prompt: retryPrompt,
        callBackUrl: lyricsCallbackUrl,
      });
      const second = await waitForLyricsResult({
        apiKey,
        taskId: retryTaskId,
      });
      if (scoreLyricsCompleteness(second.text) > scoreLyricsCompleteness(lyricsText)) {
        lyricsText = second.text;
        suggestedTitle = second.suggestedTitle;
        winningLyricsTaskId = retryTaskId;
      }
    }

    const musicStyle = `${styleLabel}, ${artist.referenceStyle}`.slice(
      0,
      MUSIC_STYLE_MAX
    );

    const kiePayload: Record<string, unknown> = {
      prompt: lyricsText,
      style: musicStyle,
      title,
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
    else if (artist.suggestedVocal) vg = artist.suggestedVocal;
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
      title,
      subject,
      keyPoints,
      style,
      artistInspiration: artist.title,
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
      artistTitle: artist.title,
      referenceStyle: artist.referenceStyle,
    };

    return NextResponse.json({ song, taskId, requestPreview });
  } catch (error) {
    console.error("Generate error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

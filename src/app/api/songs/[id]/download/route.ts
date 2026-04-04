import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getSongByIdForUser } from "@/lib/songs-store";
import { safeDownloadBasename } from "@/lib/download-filename";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const song = await getSongByIdForUser(user.id, id);
    if (!song?.audioUrl) {
      return NextResponse.json({ error: "Song or audio not found" }, { status: 404 });
    }

    const upstream = await fetch(song.audioUrl, {
      redirect: "follow",
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: "Could not fetch audio file" },
        { status: 502 }
      );
    }

    const base = safeDownloadBasename(song.title);
    const asciiName = `${base}.mp3`;
    const utf8Title =
      (song.title.trim() || "song")
        .replace(/[/\\?%*:|"<>]/g, "")
        .trim()
        .slice(0, 120) || "song";
    const utf8Name = encodeURIComponent(`${utf8Title}.mp3`);

    const contentType =
      upstream.headers.get("content-type")?.split(";")[0]?.trim() || "audio/mpeg";

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
      },
    });
  } catch (error) {
    console.error("Song download error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

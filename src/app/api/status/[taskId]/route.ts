import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { syncMusicTaskFromKie } from "@/lib/kie-music-status";
import { getSongByTaskForUser, updateSongByTask } from "@/lib/songs-store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    let song = await getSongByTaskForUser(user.id, taskId);
    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    const apiKey = process.env.KIE_API_KEY;
    const needsSync =
      Boolean(apiKey) &&
      song.taskId === taskId &&
      (song.status === "generating" ||
        (song.status === "completed" && !song.audioUrl));

    if (needsSync && apiKey) {
      const outcome = await syncMusicTaskFromKie(apiKey, taskId);
      if (outcome.kind === "updated") {
        await updateSongByTask(taskId, {
          audioUrl: outcome.audioUrl,
          imageUrl: outcome.imageUrl,
          lyrics: outcome.lyrics,
          duration: outcome.duration,
          status: outcome.status,
        });
        song = await getSongByTaskForUser(user.id, taskId);
        if (!song) {
          return NextResponse.json({ error: "Song not found" }, { status: 404 });
        }
      }
    }

    return NextResponse.json(song);
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

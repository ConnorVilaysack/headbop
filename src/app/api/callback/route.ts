import { NextRequest, NextResponse } from "next/server";
import { updateSongByTask } from "@/lib/songs-store";

function resolveTaskId(payload: Record<string, unknown>): string | undefined {
  const raw = payload.task_id ?? payload.taskId;
  return typeof raw === "string" && raw.length > 0 ? raw : undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, data } = body as {
      code?: number;
      data?: Record<string, unknown>;
    };

    if (code !== 200 || !data) {
      const tid = data ? resolveTaskId(data) : undefined;
      if (tid) await updateSongByTask(tid, { status: "failed" });
      return NextResponse.json({ code: 200, msg: "received" });
    }

    const callbackType = data.callbackType;
    const taskId = resolveTaskId(data);
    const tracks = data.data as Array<Record<string, unknown>> | undefined;

    if (!taskId) {
      return NextResponse.json({ code: 200, msg: "no task_id" });
    }

    if (
      (callbackType === "complete" || callbackType === "first") &&
      tracks &&
      tracks.length > 0
    ) {
      const track = tracks[0];
      const audioUrl =
        (typeof track.audio_url === "string" ? track.audio_url : null) ??
        (typeof track.audioUrl === "string" ? track.audioUrl : null) ??
        (typeof track.stream_audio_url === "string"
          ? track.stream_audio_url
          : null) ??
        (typeof track.streamAudioUrl === "string" ? track.streamAudioUrl : null);
      const imageUrl =
        (typeof track.image_url === "string" ? track.image_url : null) ??
        (typeof track.imageUrl === "string" ? track.imageUrl : null);
      const lyrics =
        typeof track.prompt === "string"
          ? track.prompt
          : typeof track.lyrics === "string"
            ? track.lyrics
            : null;
      const duration =
        typeof track.duration === "number" ? track.duration : null;

      await updateSongByTask(taskId, {
        audioUrl,
        imageUrl,
        lyrics,
        duration,
        status: "completed",
      });
    }

    return NextResponse.json({ code: 200, msg: "success" });
  } catch (error) {
    console.error("Callback error:", error);
    return NextResponse.json({ code: 500, msg: "error" });
  }
}

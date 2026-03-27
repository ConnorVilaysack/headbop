import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, data } = body;

    if (code !== 200 || !data) {
      if (data?.task_id) {
        await prisma.song.updateMany({
          where: { taskId: data.task_id },
          data: { status: "failed" },
        });
      }
      return NextResponse.json({ code: 200, msg: "received" });
    }

    const { callbackType, task_id, data: tracks } = data;

    if (!task_id) {
      return NextResponse.json({ code: 200, msg: "no task_id" });
    }

    if (
      (callbackType === "complete" || callbackType === "first") &&
      tracks?.length > 0
    ) {
      const track = tracks[0];
      await prisma.song.updateMany({
        where: { taskId: task_id },
        data: {
          audioUrl: track.audio_url || null,
          imageUrl: track.image_url || null,
          lyrics: track.prompt || null,
          duration: track.duration || null,
          status: "completed",
        },
      });
    }

    return NextResponse.json({ code: 200, msg: "success" });
  } catch (error) {
    console.error("Callback error:", error);
    return NextResponse.json({ code: 500, msg: "error" });
  }
}

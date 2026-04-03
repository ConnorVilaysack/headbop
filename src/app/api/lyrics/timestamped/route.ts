import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getSongByTaskForUser } from "@/lib/songs-store";

const KIE_TIMESTAMPED_URL =
  "https://api.kie.ai/api/v1/generate/get-timestamped-lyrics";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { taskId, audioId } = body as {
      taskId?: string;
      audioId?: string;
    };

    // Allow callers to pass taskId only; we look up audioId from the DB.
    const song =
      taskId && typeof taskId === "string"
        ? await getSongByTaskForUser(user.id, taskId)
        : null;

    const resolvedTaskId = typeof taskId === "string" ? taskId : song?.taskId;
    const resolvedAudioId =
      typeof audioId === "string" ? audioId : song?.audioId;

    if (!resolvedTaskId || !resolvedAudioId) {
      return NextResponse.json(
        { error: "Missing taskId or audioId" },
        { status: 400 }
      );
    }

    const apiKey = process.env.KIE_API_KEY;
    if (!apiKey || apiKey === "your-kie-api-key-here") {
      return NextResponse.json(
        { error: "KIE API key not configured" },
        { status: 500 }
      );
    }

    const kieRes = await fetch(KIE_TIMESTAMPED_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        taskId: resolvedTaskId,
        audioId: resolvedAudioId,
      }),
    });

    const kieJson = await kieRes.json();

    // The KIE response follows the same pattern: { code, msg, data: { ... } }
    if (kieJson?.code !== 200 || !kieJson?.data) {
      return NextResponse.json(
        { error: kieJson?.msg || "Failed to fetch timestamped lyrics" },
        { status: 502 }
      );
    }

    return NextResponse.json(kieJson.data);
  } catch (e) {
    console.error("timestamped-lyrics error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


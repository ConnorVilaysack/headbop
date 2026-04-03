const KIE_MUSIC_INFO_URL = "https://api.kie.ai/api/v1/generate/record-info";

const FAILURE_STATUSES = new Set([
  "CREATE_TASK_FAILED",
  "GENERATE_AUDIO_FAILED",
  "CALLBACK_EXCEPTION",
  "SENSITIVE_WORD_ERROR",
]);

export type MusicTaskSyncOutcome =
  | { kind: "unchanged" }
  | {
      kind: "updated";
      audioUrl: string | null;
      streamAudioUrl: string | null;
      audioId: string | null;
      imageUrl: string | null;
      lyrics: string | null;
      duration: number | null;
      status: "completed" | "failed";
    };

function firstPlayableTrack(sunoData: unknown): {
  audioUrl: string | null;
  streamAudioUrl: string | null;
  audioId: string | null;
  imageUrl: string | null;
  lyrics: string | null;
  duration: number | null;
} | null {
  if (!Array.isArray(sunoData) || sunoData.length === 0) return null;
  const rows = sunoData as Array<Record<string, unknown>>;
  const withAudio =
    rows.find((t) => {
      const a = t.audioUrl ?? t.audio_url;
      return typeof a === "string" && a.length > 0;
    }) ?? rows[0];
  const audioUrl =
    (withAudio.audioUrl as string | undefined) ??
    (withAudio.audio_url as string | undefined) ??
    null;
  const streamAudioUrl =
    (withAudio.streamAudioUrl as string | undefined) ??
    (withAudio.stream_audio_url as string | undefined) ??
    null;
  const audioId =
    (typeof withAudio.id === "string" && withAudio.id.length > 0
      ? (withAudio.id as string)
      : null) ??
    (typeof withAudio.audioId === "string" && withAudio.audioId.length > 0
      ? (withAudio.audioId as string)
      : null);
  const imageUrl =
    ((withAudio.imageUrl ?? withAudio.image_url) as string | undefined) || null;
  const lyrics =
    ((withAudio.prompt ?? withAudio.lyrics) as string | undefined) || null;
  const durationRaw = withAudio.duration;
  const duration =
    typeof durationRaw === "number" && !Number.isNaN(durationRaw)
      ? durationRaw
      : null;
  return { audioUrl, streamAudioUrl, audioId, imageUrl, lyrics, duration };
}

/**
 * Polls KIE "Get Music Task Details" and returns DB patch fields when the task
 * has finished or has playable audio. Use when webhooks are unreachable (e.g. localhost).
 */
export async function syncMusicTaskFromKie(
  apiKey: string,
  taskId: string
): Promise<MusicTaskSyncOutcome> {
  const res = await fetch(
    `${KIE_MUSIC_INFO_URL}?taskId=${encodeURIComponent(taskId)}`,
    { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store" }
  );

  let json: {
    code?: number;
    data?: {
      status?: string;
      response?: { sunoData?: unknown };
      errorMessage?: string | null;
    };
  };

  try {
    json = await res.json();
  } catch {
    return { kind: "unchanged" };
  }

  if (json.code !== 200 || !json.data?.status) {
    return { kind: "unchanged" };
  }

  const { status, response } = json.data;

  if (status && FAILURE_STATUSES.has(status)) {
    return {
      kind: "updated",
      audioUrl: null,
      streamAudioUrl: null,
      audioId: null,
      imageUrl: null,
      lyrics: null,
      duration: null,
      status: "failed",
    };
  }

  const track = firstPlayableTrack(response?.sunoData);
  const canUsePartialAudio =
    status === "FIRST_SUCCESS" || status === "SUCCESS";

  if (track?.audioUrl && canUsePartialAudio) {
    return {
      kind: "updated",
      audioUrl: track.audioUrl,
      streamAudioUrl: track.streamAudioUrl,
      audioId: track.audioId,
      imageUrl: track.imageUrl,
      lyrics: track.lyrics,
      duration: track.duration,
      status: "completed",
    };
  }

  if (status === "SUCCESS") {
    if (track && !track.audioUrl) {
      return {
        kind: "updated",
        audioUrl: null,
        streamAudioUrl: track.streamAudioUrl,
        audioId: track.audioId,
        imageUrl: track.imageUrl,
        lyrics: track.lyrics,
        duration: track.duration,
        status: "failed",
      };
    }
    if (!track) {
      return {
        kind: "updated",
        audioUrl: null,
        streamAudioUrl: null,
        audioId: null,
        imageUrl: null,
        lyrics: null,
        duration: null,
        status: "failed",
      };
    }
  }

  return { kind: "unchanged" };
}

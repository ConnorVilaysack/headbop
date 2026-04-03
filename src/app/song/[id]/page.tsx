import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AudioPlayer } from "@/components/AudioPlayer";
import { getAuthenticatedUser } from "@/lib/auth";
import { getSongByIdForUser } from "@/lib/songs-store";
import { getVibeLabel } from "@/lib/vibes";

export default async function SongPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/auth");
  }

  const { id } = await params;
  const song = await getSongByIdForUser(user.id, id);
  if (!song) notFound();

  const fullStyle = getVibeLabel(song.style);
  const styleLabel =
    fullStyle.length > 80 ? `${fullStyle.slice(0, 80).trimEnd()}…` : fullStyle;

  return (
    <div className="max-w-3xl mx-auto pl-12 pr-6 sm:pl-16 sm:pr-10 py-10 sm:py-14">
      <div className="mb-10">
        <Link
          href="/library"
          className="text-sm text-stone-600 hover:text-stone-900 transition-colors"
        >
          ← Back to Library
        </Link>
      </div>

      <div className="space-y-8 pb-12">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">
            {song.title}
          </h1>
          <p className="text-stone-600 mt-2 capitalize break-words">
            {song.subject} &middot;{" "}
            <span className="inline-block max-w-full align-bottom truncate">
              {styleLabel}
            </span>
            {song.artistInspiration ? <> &middot; {song.artistInspiration}</> : null}
          </p>
        </div>

        {song.status !== "completed" ? (
          <p className="text-stone-600 text-sm border-l-4 border-amber-400 pl-4 py-1">
            This track is still generating. Check back in a bit.
          </p>
        ) : song.audioUrl ? (
          <AudioPlayer
            src={song.audioUrl}
            streamSrc={song.streamAudioUrl}
            title={song.title}
            style={getVibeLabel(song.style)}
            lyrics={song.lyrics}
            keyPoints={song.keyPoints}
            timestampTaskId={song.taskId}
            timestampAudioId={song.audioId}
          />
        ) : (
          <p className="text-stone-600 text-sm border-l-4 border-stone-300 pl-4 py-1">
            Track completed but audio is not available yet.
          </p>
        )}
      </div>
    </div>
  );
}


import Link from "next/link";
import { notFound } from "next/navigation";
import { AudioPlayer } from "@/components/AudioPlayer";
import { getVibeLabel } from "@/lib/vibes";
import { prisma } from "@/lib/db";

export default async function SongPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const song = await prisma.song.findUnique({ where: { id } });
  if (!song) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/library"
          className="text-sm text-white/50 hover:text-white transition-colors"
        >
          ← Back to Library
        </Link>
      </div>

      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            {song.title}
          </h1>
          <p className="text-white/40 mt-1 capitalize">
            {song.subject} &middot; {getVibeLabel(song.style)}
            {song.artistInspiration ? <> &middot; {song.artistInspiration}</> : null}
          </p>
        </div>

        {song.status !== "completed" ? (
          <div className="bg-[#0A0A0A] rounded-2xl border border-white/[0.06] p-8">
            <p className="text-white/40 text-sm">
              This track is still generating. Check back in a bit.
            </p>
          </div>
        ) : song.audioUrl ? (
          <AudioPlayer
            src={song.audioUrl}
            title={song.title}
            style={getVibeLabel(song.style)}
            lyrics={song.lyrics}
          />
        ) : (
          <div className="bg-[#0A0A0A] rounded-2xl border border-white/[0.06] p-8">
            <p className="text-white/40 text-sm">
              Track completed but audio is not available yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


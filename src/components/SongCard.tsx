"use client";

import { getVibeLabel } from "@/lib/vibes";
import { AudioPlayer } from "./AudioPlayer";
import Link from "next/link";

export interface SongData {
  id: string;
  title: string;
  subject: string;
  keyPoints: string;
  style: string;
  artistInspiration?: string | null;
  lyrics: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  duration: number | null;
  status: string;
  createdAt: string;
}

interface SongCardProps {
  song: SongData;
  onDelete?: (id: string) => void;
  index?: number;
}

/** Deterministic bar height — `Math.random()` breaks SSR/client hydration. */
function barHeightPercent(songId: string, barIndex: number): number {
  let h = 2166136261;
  for (let k = 0; k < songId.length; k++) {
    const code = songId.charCodeAt(k);
    h ^= code;
    h = Math.imul(h, 16777619);
  }
  h ^= barIndex * 374761393;
  h >>>= 0;
  const jitter = (h % 21) / 100;
  return 20 + Math.sin(barIndex * 0.8) * 30 + jitter * 20;
}

function formatSongDateUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function SongCard({ song, onDelete, index = 0 }: SongCardProps) {
  const styleLabel = getVibeLabel(song.style);
  const stylePill =
    styleLabel.length > 26 ? `${styleLabel.slice(0, 26).trimEnd()}…` : styleLabel;

  return (
    <div
      className="group animate-fade-up"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
    >
      <Link
        href={`/song/${song.id}`}
        className="block relative bg-white/80 rounded-xl border border-stone-300/90 hover:border-stone-400 transition-all duration-500 overflow-hidden hover:shadow-md hover:-translate-y-0.5"
      >
        {/* Cover */}
        <div className="relative h-40 overflow-hidden">
          {song.imageUrl ? (
            <img
              src={song.imageUrl}
              alt={song.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-dark/80 via-purple/50 to-black">
              <div className="absolute inset-0 flex items-end justify-center gap-1 pb-6 opacity-15 group-hover:opacity-30 transition-opacity duration-500">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-white/60 rounded-full"
                    style={{ height: `${barHeightPercent(song.id, i)}%` }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/40 via-transparent to-transparent" />

          <div className="absolute top-3 right-3 max-w-[70%] px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-full border border-stone-200 text-[11px] text-stone-700 font-medium shadow-sm truncate">
            {stylePill}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-stone-900 truncate">{song.title}</h3>
            <p className="text-sm text-stone-600 truncate">{song.subject}</p>
            {song.artistInspiration ? (
              <p className="text-xs text-stone-500 truncate mt-0.5">{song.artistInspiration}</p>
            ) : null}
          </div>

          {song.audioUrl && song.status === "completed" ? (
            <AudioPlayer src={song.audioUrl} title={song.title} compact />
          ) : song.status === "generating" ? (
            <div className="flex items-center gap-2">
              <div className="flex items-end gap-[2px] h-4">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-[3px] bg-gradient-to-t from-purple to-gold rounded-full animate-bar-dance"
                    style={{ height: "100%", animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <span className="text-xs text-stone-500">Generating...</span>
            </div>
          ) : song.status === "failed" ? (
            <p className="text-sm text-red-400">Generation failed</p>
          ) : null}

          <div className="flex items-center justify-between pt-2 border-t border-stone-200">
            <span className="text-[11px] text-stone-400">
              {formatSongDateUtc(song.createdAt)}
            </span>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(song.id);
                }}
                className="text-[11px] text-stone-400 hover:text-red-600 transition-colors duration-200 cursor-pointer opacity-0 group-hover:opacity-100"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

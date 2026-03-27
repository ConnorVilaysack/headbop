"use client";

import type { ArtistInspiration } from "@/lib/artist-inspirations";
import { getArtistsForVibe } from "@/lib/artist-inspirations";

interface ArtistInspirationPickerProps {
  vibeId: string;
  value: string;
  onChange: (artistId: string, artist: ArtistInspiration | null) => void;
  onSuggestedVocal?: (v: "m" | "f" | null) => void;
}

export function ArtistInspirationPicker({
  vibeId,
  value,
  onChange,
  onSuggestedVocal,
}: ArtistInspirationPickerProps) {
  const list = vibeId ? getArtistsForVibe(vibeId) : [];

  if (!vibeId) return null;

  return (
    <div className="space-y-2 animate-fade-up overflow-hidden">
      <label className="block text-sm font-medium text-white">
        Inspiration
      </label>
      <p className="text-xs text-white/40">
        Pick a reference profile for vocal tone and production. The API only receives stylistic
        descriptors (not a voice clone).
      </p>
      <div className="flex flex-wrap gap-2">
        {list.map((a) => {
          const active = value === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                if (active) {
                  onChange("", null);
                  onSuggestedVocal?.(null);
                  return;
                }
                onChange(a.id, a);
                onSuggestedVocal?.(a.suggestedVocal ?? null);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 cursor-pointer max-w-[min(100%,14rem)] truncate ${
                active
                  ? "border-gold/50 bg-gold/[0.12] text-gold"
                  : "border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:border-white/[0.14]"
              }`}
              title={a.referenceStyle}
            >
              {a.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}

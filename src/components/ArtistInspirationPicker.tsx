"use client";

import type { ArtistInspiration } from "@/lib/artist-inspirations";
import { getArtistsForVibe } from "@/lib/artist-inspirations";
import { rainbowActiveClassesForId } from "@/lib/rainbow-chips";

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
      <label className="block text-sm font-medium text-stone-800">
        Inspiration
      </label>
      <p className="text-xs text-stone-500">
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
                  ? rainbowActiveClassesForId(a.id)
                  : "border-stone-300 bg-white/50 text-stone-600 hover:bg-white hover:border-stone-400"
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

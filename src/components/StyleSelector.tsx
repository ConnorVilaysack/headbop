"use client";

import {
  CUSTOM_STYLE_MAX_CHARS,
  CUSTOM_VIBE_ID,
  VIBES,
} from "@/lib/vibes";
import { rainbowActiveClasses } from "@/lib/rainbow-chips";

interface StyleSelectorProps {
  value: string;
  customText: string;
  onChange: (value: string) => void;
  onCustomTextChange: (text: string) => void;
}

export function StyleSelector({
  value,
  customText,
  onChange,
  onCustomTextChange,
}: StyleSelectorProps) {
  const chipInactive =
    "border-stone-300 bg-white/50 text-stone-600 hover:bg-white hover:border-stone-400 hover:text-stone-900";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {VIBES.map((v, i) => {
          const isActive = value === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onChange(v.id === value ? "" : v.id)}
              className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-200 cursor-pointer ${
                isActive ? rainbowActiveClasses(i) : chipInactive
              }`}
            >
              {v.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() =>
            onChange(value === CUSTOM_VIBE_ID ? "" : CUSTOM_VIBE_ID)
          }
          className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-200 cursor-pointer ${
            value === CUSTOM_VIBE_ID
              ? rainbowActiveClasses(VIBES.length)
              : chipInactive
          }`}
        >
          Custom
        </button>
      </div>

      {value === CUSTOM_VIBE_ID ? (
        <div className="space-y-2 animate-fade-up">
          <label
            htmlFor="custom-style"
            className="block text-sm font-medium text-stone-800"
          >
            Describe your style
          </label>
          <p className="text-xs text-stone-500">
            Genre, mood, instruments, vocals — short or detailed; we use this for
            lyrics and the music model.
          </p>
          <textarea
            id="custom-style"
            value={customText}
            onChange={(e) => onCustomTextChange(e.target.value)}
            placeholder="e.g. Gentle folk-pop with fingerpicked guitar, soft percussion, friendly male vocal, kids on the chorus…"
            maxLength={CUSTOM_STYLE_MAX_CHARS}
            rows={5}
            className="w-full px-4 py-3 rounded-lg bg-white/70 border border-stone-300 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-purple/20 focus:border-purple/40 transition-all duration-300 resize-y min-h-[7rem] text-sm leading-relaxed"
          />
          <p className="text-xs text-stone-500 tabular-nums text-right">
            {customText.length}/{CUSTOM_STYLE_MAX_CHARS}
          </p>
        </div>
      ) : null}
    </div>
  );
}

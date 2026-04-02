"use client";

import {
  CUSTOM_STYLE_MAX_CHARS,
  CUSTOM_VIBE_ID,
  VIBES,
} from "@/lib/vibes";

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
    "border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:border-white/[0.14] hover:text-white";
  const chipActive =
    "border-gold/50 bg-gold/[0.12] text-gold shadow-[0_0_16px_rgba(253,185,39,0.12)]";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {VIBES.map((v) => {
          const isActive = value === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onChange(v.id === value ? "" : v.id)}
              className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-200 cursor-pointer ${
                isActive ? chipActive : chipInactive
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
            value === CUSTOM_VIBE_ID ? chipActive : chipInactive
          }`}
        >
          Custom
        </button>
      </div>

      {value === CUSTOM_VIBE_ID ? (
        <div className="space-y-2 animate-fade-up">
          <label
            htmlFor="custom-style"
            className="block text-sm font-medium text-white"
          >
            Describe your style
          </label>
          <p className="text-xs text-white/40">
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
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-all duration-300 resize-y min-h-[7rem] text-sm leading-relaxed"
          />
          <p className="text-xs text-white/40 tabular-nums text-right">
            {customText.length}/{CUSTOM_STYLE_MAX_CHARS}
          </p>
        </div>
      ) : null}
    </div>
  );
}

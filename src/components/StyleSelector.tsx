"use client";

import { VIBES } from "@/lib/vibes";

interface StyleSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function StyleSelector({ value, onChange }: StyleSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {VIBES.map((v) => {
        const isActive = value === v.id;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onChange(v.id === value ? "" : v.id)}
            className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-200 cursor-pointer ${
              isActive
                ? "border-gold/50 bg-gold/[0.12] text-gold shadow-[0_0_16px_rgba(253,185,39,0.12)]"
                : "border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:border-white/[0.14] hover:text-white"
            }`}
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}

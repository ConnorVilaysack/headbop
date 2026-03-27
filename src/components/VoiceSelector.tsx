"use client";

interface VoiceSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function VoiceSelector({ value, onChange }: VoiceSelectorProps) {
  const options = [
    { id: "", label: "Any", icon: "🎙️" },
    { id: "f", label: "Female", icon: "👩‍🎤" },
    { id: "m", label: "Male", icon: "👨‍🎤" },
  ];

  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all duration-300 cursor-pointer ${
            value === opt.id
              ? "border-gold/40 bg-gold/[0.08]"
              : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12]"
          }`}
        >
          <span className="text-lg">{opt.icon}</span>
          <span
            className={`text-sm font-medium ${
              value === opt.id ? "text-gold" : "text-white/60"
            }`}
          >
            {opt.label}
          </span>
        </button>
      ))}
    </div>
  );
}

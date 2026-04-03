"use client";

interface VoiceSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 10a7 7 0 01-14 0M12 19v3m-3 0h6" />
    </svg>
  );
}

function VocalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 12a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H5z" />
    </svg>
  );
}

const voiceActive: Record<string, string> = {
  "": "border-violet-500 bg-violet-100/90 text-violet-950 shadow-sm ring-2 ring-violet-400/35",
  f: "border-pink-500 bg-pink-100/90 text-pink-950 shadow-sm ring-2 ring-pink-400/40",
  m: "border-blue-500 bg-blue-100/90 text-blue-950 shadow-sm ring-2 ring-blue-400/40",
};

const voiceIconActive: Record<string, string> = {
  "": "text-violet-800",
  f: "text-pink-700",
  m: "text-blue-700",
};

export function VoiceSelector({ value, onChange }: VoiceSelectorProps) {
  const options = [
    { id: "", label: "Any", Icon: MicIcon },
    { id: "f", label: "Female", Icon: VocalIcon },
    { id: "m", label: "Male", Icon: VocalIcon },
  ] as const;

  return (
    <div className="flex gap-2">
      {options.map((opt) => {
        const Icon = opt.Icon;
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-all duration-300 cursor-pointer ${
              active
                ? voiceActive[opt.id] ?? voiceActive[""]!
                : "border-stone-300 bg-white/50 hover:bg-white hover:border-stone-400"
            }`}
          >
            <Icon
              className={`w-5 h-5 shrink-0 ${
                active ? voiceIconActive[opt.id] ?? "text-stone-500" : "text-stone-500"
              }`}
            />
            <span className={`text-sm font-medium ${!active ? "text-stone-600" : ""}`}>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

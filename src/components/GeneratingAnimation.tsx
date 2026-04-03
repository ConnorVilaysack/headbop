"use client";

export function GeneratingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-8 animate-fade-up">
      <div className="relative w-32 h-32">
        {/* Soft purple glow */}
        <div className="absolute inset-[-30%] rounded-full bg-purple/15 blur-3xl animate-glow-breathe" />

        {/* Rings */}
        <div className="absolute inset-0 rounded-full border border-stone-300/80 animate-spin-slow" />
        <div className="absolute inset-3 rounded-full border border-stone-300/50 animate-spin-slow" style={{ animationDirection: "reverse", animationDuration: "6s" }} />
        <div className="absolute inset-6 rounded-full border border-stone-200/80 animate-spin-slow" style={{ animationDuration: "4s" }} />

        {/* Orbiting dots */}
        <div className="absolute inset-0 animate-orbit">
          <div className="w-2 h-2 rounded-full bg-gold shadow-[0_0_10px_rgba(253,185,39,0.6)]" />
        </div>
        <div className="absolute inset-0 animate-orbit" style={{ animationDelay: "-2s", animationDuration: "4s" }}>
          <div className="w-1.5 h-1.5 rounded-full bg-purple-light shadow-[0_0_10px_rgba(139,95,191,0.6)]" />
        </div>

        {/* Center bars */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-end gap-[3px] h-8">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="w-[3px] rounded-full bg-gradient-to-t from-purple to-gold animate-bar-dance"
                style={{ height: "100%", animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-stone-900">
          Composing your track
          <span className="inline-flex ml-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="animate-wave inline-block text-stone-400" style={{ animationDelay: `${i * 0.2}s` }}>.</span>
            ))}
          </span>
        </h3>
        <p className="text-sm text-stone-600 max-w-xs mx-auto">
          KIE is writing lyrics from your points, then composing audio. This can take 1–3 minutes.
        </p>
      </div>

      <div className="w-48 h-1 rounded-full overflow-hidden bg-stone-200">
        <div className="h-full w-full bg-gradient-to-r from-transparent via-purple/40 to-transparent animate-shimmer" />
      </div>
    </div>
  );
}

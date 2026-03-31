import Link from "next/link";

export default function BillingSuccessPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
      <div className="relative animate-scale-in">
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-purple/35 via-gold/30 to-purple/35" />
        <div className="relative rounded-2xl border border-white/[0.08] bg-[#0A0A0A]/95 p-8 sm:p-10 text-center overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-grid-fine opacity-25" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.12] bg-white/[0.04] text-xs text-white/70 mb-4">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Subscription started
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              You’re all set
            </h1>
            <p className="text-white/50 mt-3 max-w-xl mx-auto leading-relaxed">
              Your 7‑day free trial is active. You can now generate and save songs in headbop.
            </p>
            <div className="mt-7">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-black font-semibold hover:brightness-110 transition-all duration-300 hover:shadow-[0_0_28px_rgba(253,185,39,0.2)]"
              >
                Start creating
              </Link>
            </div>
            <p className="text-xs text-white/25 mt-4">
              If access doesn’t unlock immediately, wait a few seconds and refresh.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


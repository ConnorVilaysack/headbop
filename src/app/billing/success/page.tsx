import Link from "next/link";

export default function BillingSuccessPage() {
  return (
    <div className="max-w-2xl mx-auto pl-12 pr-6 sm:pl-16 sm:pr-10 py-12 sm:py-16 pb-24">
      <div className="border-l-4 border-emerald-500 pl-5 py-1 animate-scale-in">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-800 mb-2">
          Subscription started
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
          You’re all set
        </h1>
        <p className="text-stone-600 mt-3 max-w-xl leading-relaxed">
          Your 7‑day free trial is active. You can now generate and save songs in headbop.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-gradient-to-r from-gold to-gold-dark text-black font-semibold hover:brightness-105 transition-all shadow-sm"
          >
            Start creating
          </Link>
        </div>
        <p className="text-xs text-stone-500 mt-6">
          If access doesn’t unlock immediately, wait a few seconds and refresh.
        </p>
      </div>
    </div>
  );
}

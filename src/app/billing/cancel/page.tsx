import Link from "next/link";

export default function BillingCancelPage() {
  return (
    <div className="max-w-2xl mx-auto pl-12 pr-6 sm:pl-16 sm:pr-10 py-12 sm:py-16 pb-24 text-center animate-scale-in">
      <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
        Checkout canceled
      </h1>
      <p className="text-stone-600 mt-3 max-w-xl mx-auto leading-relaxed">
        No worries — you can start your free trial anytime.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-gradient-to-r from-gold to-gold-dark text-black font-semibold hover:brightness-105 transition-all shadow-sm"
        >
          Back to create
        </Link>
        <Link
          href="/library"
          className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg border border-stone-300 bg-white/70 text-stone-800 hover:bg-white transition-all"
        >
          View library
        </Link>
      </div>
    </div>
  );
}

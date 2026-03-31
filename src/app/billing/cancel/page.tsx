import Link from "next/link";

export default function BillingCancelPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
      <div className="bg-[#0A0A0A] rounded-2xl border border-white/[0.08] p-8 sm:p-10 text-center animate-scale-in">
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Checkout canceled
        </h1>
        <p className="text-white/50 mt-3 max-w-xl mx-auto leading-relaxed">
          No worries — you can start your free trial anytime.
        </p>
        <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-black font-semibold hover:brightness-110 transition-all duration-300"
          >
            Back to create
          </Link>
          <Link
            href="/library"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-white/[0.12] bg-white/[0.03] text-white/80 hover:text-white hover:bg-white/[0.06] transition-all duration-300"
          >
            View library
          </Link>
        </div>
      </div>
    </div>
  );
}


"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      if (!supabase) {
        setError("Supabase env vars are missing.");
        return;
      }
      if (mode === "signup") {
        const { error: signErr } = await supabase.auth.signUp({ email, password });
        if (signErr) {
          setError(signErr.message);
        } else {
          setMessage("Account created. If email confirmation is enabled, check your inbox.");
          router.push("/");
          router.refresh();
        }
      } else {
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (loginErr) {
          setError(loginErr.message);
        } else {
          router.push("/");
          router.refresh();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative max-w-5xl mx-auto px-4 py-10 sm:py-14">
      <div className="pointer-events-none absolute -top-16 left-1/4 w-72 h-72 rounded-full bg-purple/20 blur-[90px] animate-glow-breathe" />
      <div className="pointer-events-none absolute -bottom-20 right-1/4 w-64 h-64 rounded-full bg-gold/15 blur-[100px] animate-glow-pulse" />

      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0A0A0A]/95 backdrop-blur-xl animate-scale-in">
        <div className="grid lg:grid-cols-2">
          <div className="relative p-8 sm:p-10 border-b lg:border-b-0 lg:border-r border-white/[0.08]">
            <div className="absolute inset-0 bg-grid-fine opacity-40" />
            <div className="relative space-y-6 animate-fade-up">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.03] px-3 py-1 text-xs text-white/70">
                <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
                Teacher music workspace
              </div>

              <div className="space-y-3">
                <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight tracking-tight">
                  Welcome to
                  <span className="block bg-gradient-to-r from-gold via-gold-light to-purple-light bg-clip-text text-transparent animate-gradient-shift">
                    headbop
                  </span>
                </h1>
                <p className="text-white/55 leading-relaxed max-w-md">
                  Sign in to create and save AI lesson songs. Your library syncs to your account so you can reuse tracks anytime.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-white/70">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.08]">1</span>
                  Generate from lesson points
                </div>
                <div className="flex items-center gap-3 text-sm text-white/70">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.08]">2</span>
                  Save songs per account
                </div>
                <div className="flex items-center gap-3 text-sm text-white/70">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.08]">3</span>
                  Play and share in class
                </div>
              </div>

              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
              >
                <span aria-hidden>←</span>
                Back to app
              </Link>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="mx-auto max-w-md space-y-6 animate-fade-up" style={{ animationDelay: "120ms", animationFillMode: "both" }}>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-white">
                  {mode === "signup" ? "Create your account" : "Sign in"}
                </h2>
                <p className="text-sm text-white/45">
                  {mode === "signup"
                    ? "Create a secure account to save your generated tracks."
                    : "Continue where you left off."}
                </p>
              </div>

              <div className="relative grid grid-cols-2 gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
                <div
                  className={`absolute top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-lg bg-white/[0.09] border border-white/[0.12] transition-transform duration-300 ${
                    mode === "signin" ? "translate-x-0" : "translate-x-full"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={`relative z-10 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                    mode === "signin" ? "text-white" : "text-white/60 hover:text-white/85"
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`relative z-10 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                    mode === "signup" ? "text-white" : "text-white/60 hover:text-white/85"
                  }`}
                >
                  Sign up
                </button>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                {!supabase ? (
                  <p className="text-red-300 text-sm">
                    Missing `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` in environment.
                  </p>
                ) : null}

                <div className="space-y-2">
                  <label className="text-sm text-white/70 block">Email</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                    className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-gold/60 focus:shadow-[0_0_0_3px_rgba(253,185,39,0.12)] transition-all"
                    placeholder="you@school.edu"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-white/70 block">Password</label>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    required
                    minLength={6}
                    className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-gold/60 focus:shadow-[0_0_0_3px_rgba(253,185,39,0.12)] transition-all"
                    placeholder="••••••••"
                  />
                  <p className="text-xs text-white/35">Minimum 6 characters.</p>
                </div>

                {error ? (
                  <p className="text-red-300 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 animate-fade-in">
                    {error}
                  </p>
                ) : null}
                {message ? (
                  <p className="text-emerald-300 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 animate-fade-in">
                    {message}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading || !supabase}
                  className="group relative w-full py-3.5 rounded-xl font-semibold bg-gradient-to-r from-gold to-gold-dark text-black transition-all duration-300 hover:brightness-110 hover:shadow-[0_0_36px_rgba(253,185,39,0.2)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


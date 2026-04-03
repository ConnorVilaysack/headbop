"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { GlassButton } from "@/components/ui/glass-button";

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
    <div className="max-w-lg mx-auto pl-12 pr-6 sm:pl-16 sm:pr-10 py-12 sm:py-16 pb-24">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500 mb-2">
        Account
      </p>
      <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
        Welcome to <span className="text-purple-dark">headbop</span>
      </h1>
      <p className="mt-3 text-stone-600 leading-relaxed">
        Sign in to create and save AI lesson songs. Your library syncs to your account.
      </p>

      <ul className="mt-8 space-y-2 text-sm text-stone-600 list-disc pl-5">
        <li>Generate from lesson points</li>
        <li>Save songs per account</li>
        <li>Play and share in class</li>
      </ul>

      <div className="mt-10 pt-10 border-t border-stone-300/90 space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-stone-900">
            {mode === "signup" ? "Create your account" : "Sign in"}
          </h2>
          <p className="text-sm text-stone-500">
            {mode === "signup"
              ? "Create a secure account to save your generated tracks."
              : "Continue where you left off."}
          </p>
        </div>

        <div className="inline-grid w-full max-w-sm grid-cols-2 gap-1 rounded-full border border-white/50 bg-white/25 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-md">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`rounded-full py-2.5 text-sm font-medium transition-all ${
              mode === "signin"
                ? "bg-white/70 text-stone-900 shadow-sm ring-1 ring-stone-200/80"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-full py-2.5 text-sm font-medium transition-all ${
              mode === "signup"
                ? "bg-white/70 text-stone-900 shadow-sm ring-1 ring-stone-200/80"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {!supabase ? (
            <p className="text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              Missing `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` in environment.
            </p>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-800 block">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="w-full rounded-lg bg-white/80 border border-stone-300 px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-purple/20 focus:border-purple/40 transition-all"
              placeholder="you@school.edu"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-800 block">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              minLength={6}
              className="w-full rounded-lg bg-white/80 border border-stone-300 px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-purple/20 focus:border-purple/40 transition-all"
              placeholder="••••••••"
            />
            <p className="text-xs text-stone-500">Minimum 6 characters.</p>
          </div>

          {error ? (
            <p className="text-red-800 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 animate-fade-in">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="text-emerald-800 text-sm bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 animate-fade-in">
              {message}
            </p>
          ) : null}

          <GlassButton
            type="submit"
            disabled={loading || !supabase}
            size="lg"
            className="w-full"
          >
            {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
          </GlassButton>
        </form>
      </div>

      <Link
        href="/"
        className="inline-flex items-center gap-2 mt-10 text-sm text-stone-600 hover:text-stone-900 transition-colors"
      >
        <span aria-hidden>←</span>
        Back to app
      </Link>
    </div>
  );
}


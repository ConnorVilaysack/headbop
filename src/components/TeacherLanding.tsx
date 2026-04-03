"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  glassButtonVariants,
  glassButtonTextVariants,
} from "@/components/ui/glass-button";
import { AudioPlayer } from "@/components/AudioPlayer";

function LandingCta({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("glass-button-wrap w-full max-w-md", className)}>
      <Link
        href="/auth"
        className={cn("glass-button", glassButtonVariants({ size: "lg" }))}
      >
        <span className={cn(glassButtonTextVariants({ size: "lg" }))}>
          {label}
        </span>
      </Link>
      <div className="glass-button-shadow rounded-full" aria-hidden />
    </div>
  );
}

function DecoNote({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
    >
      <path
        d="M14 32V18l14-4v14"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.35"
      />
      <circle cx="12" cy="34" r="3" fill="currentColor" opacity="0.25" />
      <circle cx="30" cy="30" r="3" fill="currentColor" opacity="0.25" />
    </svg>
  );
}

function IconSparkles({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2l1.2 4.2L17 7l-3.8 1.8L12 13l-1.2-4.2L7 7l3.8-1.8L12 2zm7 9l.8 2.8L22 14l-2.5 1.2L19 18l-1.2-2.8L15 14l2.5-1.2L19 11zM5 14l1 3.5L9.5 19 5 20.5 3.5 24 2 20.5-2.5 19 2 17.5 3.5 14 5 14z" />
    </svg>
  );
}

const FEATURES = [
  {
    title: "Your lesson, their earworm",
    body: "Type your topic and key points — we turn them into singable lines that stick.",
    icon: IconSparkles,
    accent: "text-purple",
  },
  {
    title: "Sounds like your classroom",
    body: "Pick a vibe and artist inspiration so the track feels right for your age group.",
    icon: ({ className }: { className?: string }) => (
      <svg
        className={className}
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
      </svg>
    ),
    accent: "text-gold-dark",
  },
  {
    title: "Press play, teach on",
    body: "Generate, listen, and download — perfect for hooks, transitions, or review.",
    icon: ({ className }: { className?: string }) => (
      <svg
        className={className}
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        <path d="M8 5v14l11-7z" />
      </svg>
    ),
    accent: "text-purple-dark",
  },
  {
    title: "Saved in your library",
    body: "Every song lives in your account so you can reuse favourites term after term.",
    icon: ({ className }: { className?: string }) => (
      <svg
        className={className}
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
      </svg>
    ),
    accent: "text-purple",
  },
] as const;

const TESTIMONIALS = [
  {
    quote:
      "I teach Year 3. We were doing fractions and I wanted something catchy for the start of the lesson. The song actually matched what I was teaching. I did not expect that.",
    name: "Alex P.",
    yearLevel: "Year 3 teacher",
  },
  {
    quote:
      "I have Grade 1. They lose interest fast. This gave us a short song they could clap along to. I am not musical at all and it still worked on the first try.",
    name: "Sam K.",
    yearLevel: "Grade 1 teacher",
  },
  {
    quote:
      "I work with Year 6. I worried it would feel too young for them. It did not. We used it as a quick review before a test and they actually remembered the keywords.",
    name: "Jordan R.",
    yearLevel: "Year 6 teacher",
  },
] as const;

export function TeacherLanding() {
  const [demoReady, setDemoReady] = useState(false);

  return (
    <div className="teacher-landing relative pb-16 sm:pb-24">
      {/* Decorative layer */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[2rem]"
        aria-hidden
      >
        <DecoNote className="absolute -left-4 top-8 text-purple animate-landing-bob opacity-40 [animation-delay:-1.2s]" />
        <DecoNote className="absolute right-0 top-1/3 scale-75 text-gold-dark animate-landing-bob opacity-30 [animation-delay:-2.4s]" />
        <span className="absolute right-[12%] top-24 text-3xl animate-landing-wiggle text-purple/25 select-none">
          ★
        </span>
        <span className="absolute left-[8%] bottom-32 text-2xl animate-landing-wiggle text-gold/40 [animation-delay:-1.5s] select-none">
          ✦
        </span>
      </div>

      {/* Hero */}
      <header
        className="relative mb-14 sm:mb-20 text-center sm:text-left"
        style={{ animationDelay: "0ms" }}
      >
        <div
          className="animate-landing-in mb-4 inline-flex items-center gap-2 rounded-full border border-stone-200/90 bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 shadow-sm backdrop-blur-sm"
          style={{ animationDelay: "40ms" }}
        >
          <span
            className="h-2 w-2 rounded-full bg-gold shadow-[0_0_0_3px_rgba(253,185,39,0.25)]"
            aria-hidden
          />
          For primary & elementary teachers
        </div>

        <h1
          className="animate-landing-in text-balance text-3xl font-bold leading-[1.12] tracking-tight text-stone-900 sm:text-4xl lg:text-[2.65rem]"
          style={{ animationDelay: "90ms" }}
        >
          Turn lessons into{" "}
          <span className="relative inline-block">
            <span className="relative z-10 text-purple-dark">songs kids hum</span>
            <span
              className="absolute -inset-x-1 bottom-1 z-0 h-3 rounded-md bg-gradient-to-r from-transparent via-gold/55 to-transparent animate-landing-shine"
              aria-hidden
            />
          </span>{" "}
          in the corridor
        </h1>

        <p
          className="animate-landing-in mx-auto mt-5 max-w-2xl text-pretty text-lg text-stone-600 sm:mx-0 sm:text-xl"
          style={{ animationDelay: "160ms" }}
        >
          Warm, classroom-ready tracks from your own teaching points — no music degree
          required. Just you, your topic, and a little magic.
        </p>

        <div
          className="animate-landing-in mt-8 flex flex-col items-center gap-4 sm:items-start"
          style={{ animationDelay: "220ms" }}
        >
          <LandingCta label="Sign in free — 7-day trial" />
          <p className="text-center text-sm text-stone-500 sm:text-left">
            Save songs to your library · Pick vibes & voices · Cancel anytime
          </p>
        </div>

        {/* Demo card: example lesson flowing into a demo track */}
        <section
          className="animate-landing-in mt-10 w-full rounded-2xl border border-stone-200/90 bg-white/80 p-4 sm:p-5 lg:p-6 shadow-sm backdrop-blur-sm"
          style={{ animationDelay: "280ms" }}
          aria-label="Example lesson turning into a song"
        >
          <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
              See it in action
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
              Live demo track
            </span>
          </header>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)] md:items-start">
            {/* Mini lesson form */}
            <div className="space-y-2 rounded-xl bg-white/80 p-3 border border-stone-200/80">
              <div>
                <p className="text-[11px] font-medium text-stone-500 mb-0.5">Song title</p>
                <p className="text-sm font-semibold text-stone-900">The Photosynthesis Rap</p>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] text-stone-600">
                <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple" aria-hidden />
                  Year 3 science
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5">
                  Sunlight
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5">
                  Water
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5">
                  Carbon dioxide
                </span>
              </div>
              <p className="mt-2 text-[11px] text-stone-500">
                This is the kind of lesson detail you&apos;d drop into the real worksheet.
              </p>
            </div>

            {/* Demo player column */}
            <div className="flex flex-col justify-between gap-3">
              <button
                type="button"
                onClick={() => setDemoReady(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-dark px-4 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:brightness-105 cursor-pointer"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/10 text-[10px]">
                  ▶
                </span>
                Play lesson demo
              </button>

              <p className="text-[11px] text-stone-500">
                We pre-filled this example so you can hear what a finished song sounds like.
              </p>

              {demoReady && (
                <div className="mt-1 rounded-xl border border-stone-200 bg-white/90 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 mb-1">
                    Demo track
                  </p>
                  <p className="text-sm font-medium text-stone-900">The Photosynthesis Rap</p>
                  <p className="text-[11px] text-stone-500 mb-3">
                    Year 3 · science — plants · short chorus for a recap.
                  </p>
                  <AudioPlayer
                    src="/demo/demo-track.mp3"
                    title="The Photosynthesis Rap"
                    style="Upbeat classroom hip hop"
                    compact
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      </header>

      {/* Trust strip */}
      <ul
        className="animate-landing-in mb-14 flex flex-wrap justify-center gap-2 sm:justify-start"
        style={{ animationDelay: "340ms" }}
      >
        {[
          "Classroom-friendly lyrics",
          "Built for busy teachers",
          "Reuse every term",
        ].map((t) => (
          <li
            key={t}
            className="rounded-full border border-stone-200/90 bg-white/65 px-3.5 py-1.5 text-sm font-medium text-stone-600 shadow-sm backdrop-blur-sm"
          >
            {t}
          </li>
        ))}
      </ul>

      {/* Feature grid */}
      <section
        className="mb-16 sm:mb-20"
        aria-labelledby="landing-features-heading"
      >
        <h2
          id="landing-features-heading"
          className="animate-landing-in mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500"
          style={{ animationDelay: "400ms" }}
        >
          Why teachers use headbop
        </h2>
        <p
          className="animate-landing-in mb-8 text-xl font-semibold text-stone-900 sm:text-2xl"
          style={{ animationDelay: "440ms" }}
        >
          Lesson hooks, brain breaks, and reviews — without the late-night lyric hunt.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <article
                key={f.title}
                className="landing-card-lift animate-landing-in rounded-2xl border border-stone-200/90 bg-white/70 p-5 shadow-sm backdrop-blur-sm sm:p-6"
                style={{ animationDelay: `${480 + i * 70}ms` }}
              >
                <div
                  className={cn(
                    "mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-stone-50",
                    f.accent
                  )}
                >
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-semibold text-stone-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{f.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Teacher testimonials */}
      <section
        className="mb-16 sm:mb-20"
        aria-labelledby="landing-testimonials-heading"
      >
        <h2
          id="landing-testimonials-heading"
          className="animate-landing-in mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500"
          style={{ animationDelay: "640ms" }}
        >
          What teachers say
        </h2>
        <p
          className="animate-landing-in mb-8 max-w-2xl text-lg text-stone-700 sm:text-xl"
          style={{ animationDelay: "680ms" }}
        >
          The sort of thing we hear from primary teachers once a song is in the room —
          plain English, no jargon.
        </p>
        <ul className="grid gap-4 md:grid-cols-3 md:gap-5">
          {TESTIMONIALS.map((t, i) => (
            <li
              key={t.name}
              className="landing-card-lift animate-landing-in flex flex-col rounded-2xl border border-stone-200/90 bg-white/75 p-5 shadow-sm backdrop-blur-sm sm:p-6"
              style={{ animationDelay: `${720 + i * 70}ms` }}
            >
              <span
                className="mb-3 font-serif text-4xl leading-none text-gold-dark/90"
                aria-hidden
              >
                &ldquo;
              </span>
              <blockquote className="flex-1 text-sm leading-relaxed text-stone-700">
                {t.quote}
              </blockquote>
              <footer className="mt-5 border-t border-stone-200/80 pt-4">
                <p className="font-semibold text-stone-900">{t.name}</p>
                <p className="text-sm text-purple-dark/90">{t.yearLevel}</p>
              </footer>
            </li>
          ))}
        </ul>
      </section>

      {/* Final CTA */}
      <section
        className="animate-landing-in rounded-[1.75rem] border border-stone-200/90 bg-gradient-to-br from-purple-dark/[0.06] via-transparent to-gold/10 px-6 py-10 text-center sm:px-10"
        style={{ animationDelay: "820ms" }}
      >
        <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          Ready for a song they&apos;ll actually remember?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-stone-600">
          Create an account to start your free trial. Your first tracks are just a few
          clicks away.
        </p>
        <div className="mt-8 flex justify-center">
          <LandingCta label="Get started — sign in / sign up" />
        </div>
        <p className="mt-4 text-sm text-stone-500">
          Already exploring?{" "}
          <Link
            href="/auth"
            className="font-semibold text-purple-dark underline decoration-purple/30 underline-offset-2 transition hover:decoration-purple"
          >
            Head to sign in
          </Link>
        </p>
      </section>
    </div>
  );
}


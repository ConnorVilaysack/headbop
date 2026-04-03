"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ArtistInspirationPicker } from "@/components/ArtistInspirationPicker";
import { StyleSelector } from "@/components/StyleSelector";
import {
  clearCreateFormDraft,
  loadCreateFormDraft,
  saveCreateFormDraft,
} from "@/lib/create-form-draft";
import {
  CUSTOM_VIBE_ID,
  getVibeLabel,
  resolveStyleForApi,
} from "@/lib/vibes";
import { VoiceSelector } from "@/components/VoiceSelector";
import { GeneratingAnimation } from "@/components/GeneratingAnimation";
import { AudioPlayer } from "@/components/AudioPlayer";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CreatePageBackground } from "@/components/CreatePageBackground";
import { TeacherLanding } from "@/components/TeacherLanding";
import { GlassButton } from "@/components/ui/glass-button";

interface GeneratedSong {
  id: string;
  title: string;
  subject: string;
  style: string;
  artistInspiration?: string | null;
  audioUrl: string | null;
  audioId?: string | null;
  streamAudioUrl?: string | null;
  imageUrl: string | null;
  lyrics: string | null;
  status: string;
  taskId: string | null;
}

interface RequestPreview {
  model: string;
  customMode: boolean;
  instrumental: boolean;
  title: string;
  style: string;
  vocalGender: "m" | "f" | null;
  styleWeight: number;
  weirdnessConstraint: number;
  audioWeight: number;
  musicCallBackUrl: string;
  lyricsPrompt: string;
  lyricsTaskId: string;
  lyricsSuggestedTitle: string | null;
  lyricsPreview: string;
  usedPoints: string[];
  artistTitle: string;
  referenceStyle: string;
}

export default function CreatePage() {
  const [subject, setSubject] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [style, setStyle] = useState("");
  const [customStyleText, setCustomStyleText] = useState("");
  const [artistId, setArtistId] = useState("");
  const [vocalGender, setVocalGender] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSong, setGeneratedSong] = useState<GeneratedSong | null>(null);
  const [requestPreview, setRequestPreview] = useState<RequestPreview | null>(null);
  const [error, setError] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [entitled, setEntitled] = useState<boolean | null>(null);
  const [billingStatusLoading, setBillingStatusLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [restoredDraftNotice, setRestoredDraftNotice] = useState(false);
  const draftRestoreDone = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  useEffect(() => {
    if (draftRestoreDone.current) return;
    const d = loadCreateFormDraft();
    if (!d) return;
    const hasContent =
      d.subject.trim() ||
      d.keyPoints.trim() ||
      d.style ||
      d.customStyleText?.trim() ||
      d.artistId;
    if (!hasContent) return;
    draftRestoreDone.current = true;
    setSubject(d.subject);
    setKeyPoints(d.keyPoints);
    setStyle(d.style);
    setCustomStyleText(d.customStyleText ?? "");
    setArtistId(d.artistId);
    setVocalGender(d.vocalGender);
    setRestoredDraftNotice(true);
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setIsAuthed(false);
      setAuthReady(true);
      return;
    }
    let mounted = true;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!mounted) return;
        setIsAuthed(Boolean(data.user));
        setAuthReady(true);
      })
      .catch(() => {
        if (!mounted) return;
        setIsAuthed(false);
        setAuthReady(true);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(Boolean(session?.user));
      setAuthReady(true);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!isAuthed) {
      setEntitled(null);
      return;
    }
    let cancelled = false;
    setBillingStatusLoading(true);
    setBillingError("");
    fetch("/api/billing/status")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to check subscription status");
        return await r.json();
      })
      .then((j) => {
        if (cancelled) return;
        setEntitled(Boolean(j?.entitled));
      })
      .catch((e) => {
        if (cancelled) return;
        setBillingError(e instanceof Error ? e.message : "Billing error");
        setEntitled(false);
      })
      .finally(() => {
        if (!cancelled) setBillingStatusLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, isAuthed]);

  const handleStyleChange = useCallback((v: string) => {
    setStyle(v);
    setArtistId("");
    if (v !== CUSTOM_VIBE_ID) setCustomStyleText("");
  }, []);

  const pollStatus = useCallback(
    (taskId: string) => {
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/status/${taskId}`);
          if (!res.ok) return;
          const song = await res.json();
          if (song.status === "completed") {
            setGeneratedSong(song);
            // Some callbacks mark completed before audioUrl is attached.
            // Don't drop back to the form until we actually have playable audio.
            if (song.audioUrl) {
              clearCreateFormDraft();
              setIsGenerating(false);
              stopPolling();
            }
          } else if (song.status === "failed") {
            setError("Song generation failed. Please try again.");
            setIsGenerating(false);
            stopPolling();
          }
        } catch { /* keep polling */ }
      }, 5000);
    },
    [stopPolling]
  );

  const handleGenerate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setGeneratedSong(null);
      setRequestPreview(null);

      // Gate at action:
      // - If status not loaded yet, disable Generate and provide a calm message.
      // - If not entitled, open paywall (don't interrupt typing earlier).
      if (entitled === null) {
        setError("Checking subscription… please try again in a second.");
        return;
      }
      if (entitled === false) {
        setPaywallOpen(true);
        return;
      }

      if (style === CUSTOM_VIBE_ID && !customStyleText.trim()) {
        setError("Describe your custom style in a few words.");
        return;
      }

      const styleForApi = resolveStyleForApi(style, customStyleText);
      const isCustomVibe = style === CUSTOM_VIBE_ID;
      if (
        !subject.trim() ||
        !keyPoints.trim() ||
        !style ||
        !styleForApi ||
        (!isCustomVibe && !artistId)
      ) {
        setError(
          isCustomVibe
            ? "Please fill in all fields and describe your custom style."
            : "Please fill in all fields, choose a vibe, and pick an inspiration."
        );
        return;
      }

      setIsGenerating(true);

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: subject.trim(),
            keyPoints: keyPoints.trim(),
            style: styleForApi,
            artistId: isCustomVibe ? "" : artistId,
            vocalGender,
            customVibe: isCustomVibe,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to start generation.");
          setIsGenerating(false);
          return;
        }
        setGeneratedSong(data.song);
        if (data.requestPreview) setRequestPreview(data.requestPreview);
        if (data.taskId) pollStatus(data.taskId);
      } catch {
        setError("Network error. Please try again.");
        setIsGenerating(false);
      }
    },
    [
      entitled,
      subject,
      keyPoints,
      style,
      customStyleText,
      artistId,
      vocalGender,
      pollStatus,
    ]
  );

  const handleReset = useCallback(() => {
    stopPolling();
    clearCreateFormDraft();
    setSubject("");
    setKeyPoints("");
    setStyle("");
    setCustomStyleText("");
    setArtistId("");
    setVocalGender("");
    setGeneratedSong(null);
    setRequestPreview(null);
    setError("");
    setIsGenerating(false);
  }, [stopPolling]);

  const showAuthGate = authReady && !isAuthed;
  const subscriptionKnown = authReady && isAuthed && entitled !== null;
  const canAttemptGenerate = !showAuthGate && !isGenerating;
  const shouldDisableGenerate = showAuthGate || isGenerating || (isAuthed && entitled === null);

  const fieldUnderline =
    "w-full border-0 border-b-2 border-stone-400 bg-transparent px-0 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-purple focus:outline-none transition-colors text-base";
  const fieldBox =
    "w-full rounded-lg border border-stone-300 bg-white/70 px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-purple/20 focus:border-purple/40 transition-all";

  return (
    <>
      <CreatePageBackground />
      <div
        className={
          showAuthGate
            ? "relative z-[2] mx-auto max-w-5xl px-6 pb-32 pt-8 sm:px-10 sm:pt-12"
            : "relative z-[2] mx-auto max-w-2xl pl-12 pr-6 pb-32 pt-8 sm:pl-16 sm:pr-10 sm:pt-12"
        }
      >
      {showAuthGate ? (
        <>
          {restoredDraftNotice ? (
            <div className="mb-10 flex items-start gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 text-left shadow-sm backdrop-blur-sm animate-fade-up">
              <span className="text-emerald-600 text-lg leading-none mt-0.5" aria-hidden>
                ✓
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-900 font-medium">
                  Your song details were restored
                </p>
                <p className="text-xs text-stone-600 mt-0.5">
                  We kept your title, topic, and key points from before checkout. Sign in to
                  continue — your draft is ready.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRestoredDraftNotice(false)}
                className="text-stone-400 hover:text-stone-700 text-xs shrink-0 px-1"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          ) : null}
          <TeacherLanding />
        </>
      ) : (
      <header className="mb-14 sm:mb-16 pb-10 border-b border-stone-300/90 animate-fade-up">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500 mb-3">
          New song worksheet
        </p>
        <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-stone-900 tracking-tight leading-[1.15]">
          Turn lessons into{" "}
          <span className="text-purple-dark">unforgettable music</span>
        </h1>
        {restoredDraftNotice ? (
          <div className="mt-8 flex items-start gap-3 border-l-4 border-emerald-500 pl-4 py-1 text-left">
            <span className="text-emerald-600 text-lg leading-none mt-0.5" aria-hidden>
              ✓
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-stone-900 font-medium">Your song details were restored</p>
              <p className="text-xs text-stone-600 mt-0.5">
                We kept your title, topic, and key points from before checkout. You can edit or generate when you&apos;re ready.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRestoredDraftNotice(false)}
              className="text-stone-400 hover:text-stone-700 text-xs shrink-0 px-1"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        ) : null}
      </header>
      )}

      {/* ── Completed ── */}
      {showAuthGate ? null : generatedSong?.status === "completed" && generatedSong.audioUrl ? (
        <div className="animate-scale-in space-y-8 pb-16 border-b border-stone-300/90">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
              Track ready
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">{generatedSong.title}</h2>
            <p className="text-stone-600 mt-2 capitalize break-words">
              {generatedSong.subject} &middot;{" "}
              <span className="inline-block max-w-full align-bottom truncate">
                {(() => {
                  const s = getVibeLabel(generatedSong.style);
                  return s.length > 80 ? `${s.slice(0, 80).trimEnd()}…` : s;
                })()}
              </span>
              {generatedSong.artistInspiration ? (
                <> &middot; {generatedSong.artistInspiration}</>
              ) : null}
            </p>
          </div>

          <AudioPlayer
            src={generatedSong.audioUrl}
            streamSrc={generatedSong.streamAudioUrl ?? null}
            title={generatedSong.title}
            style={getVibeLabel(generatedSong.style)}
            lyrics={generatedSong.lyrics}
            timestampTaskId={generatedSong.taskId}
            timestampAudioId={generatedSong.audioId ?? null}
          />

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleReset}
              className="flex-1 px-6 py-3.5 border border-stone-400 bg-white/50 hover:bg-white text-stone-800 font-medium rounded-lg transition-all cursor-pointer"
            >
              Create another
            </button>
            {generatedSong.audioUrl && (
              <a
                href={generatedSong.audioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-6 py-3.5 bg-gradient-to-r from-gold to-gold-dark text-black font-semibold rounded-lg transition-all text-center shadow-sm hover:brightness-105"
              >
                Download MP3
              </a>
            )}
          </div>
        </div>
      ) : isGenerating ? (
        <div className="animate-scale-in pb-20 border-b border-stone-300/90">
          <GeneratingAnimation />
          {requestPreview && (
            <div className="mt-10 space-y-4 animate-fade-up">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-[0.15em]">
                  What we sent to the model
                </h3>
                <span className="text-xs text-stone-400 font-mono">
                  {requestPreview.model} · customMode={String(requestPreview.customMode)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="border border-stone-300/90 rounded-lg bg-white/50 p-3">
                  <div className="text-xs text-stone-500">Inspiration (your pick)</div>
                  <div className="text-sm text-stone-900 mt-0.5">{requestPreview.artistTitle}</div>
                </div>
                <div className="border border-stone-300/90 rounded-lg bg-white/50 p-3">
                  <div className="text-xs text-stone-500">Style (music API)</div>
                  <div className="text-sm text-stone-900 mt-0.5 break-words">{requestPreview.style}</div>
                </div>
                <div className="border border-stone-300/90 rounded-lg bg-white/50 p-3">
                  <div className="text-xs text-stone-500">Voice</div>
                  <div className="text-sm text-stone-900 mt-0.5">
                    {requestPreview.vocalGender === "m"
                      ? "Male"
                      : requestPreview.vocalGender === "f"
                      ? "Female"
                      : "Any"}
                  </div>
                </div>
                <div className="border border-stone-300/90 rounded-lg bg-white/50 p-3">
                  <div className="text-xs text-stone-500">Style strength</div>
                  <div className="text-sm text-stone-900 mt-0.5 font-mono">
                    {requestPreview.styleWeight.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="border border-stone-300/90 rounded-lg bg-white/50 p-3">
                <div className="text-xs text-stone-500">Descriptors sent (voice + production)</div>
                <p className="text-sm text-stone-800 mt-1">{requestPreview.referenceStyle}</p>
              </div>

              <div className="border border-stone-300/90 rounded-lg bg-white/50 p-4">
                <div className="text-xs text-stone-500 mb-2">Key points received</div>
                <ul className="space-y-1.5">
                  {requestPreview.usedPoints.map((p, idx) => (
                    <li key={idx} className="text-sm text-stone-800">
                      <span className="text-stone-400 mr-2">-</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border border-stone-300/90 rounded-lg bg-white/50 p-4 space-y-2">
                <div className="text-xs text-stone-500">Lyrics API prompt ({requestPreview.lyricsPrompt.length} / 200 chars)</div>
                <p className="text-[11px] text-stone-500">
                  KIE caps this field at ~200 characters; we compress your topic and points automatically.
                </p>
                <pre className="text-xs text-stone-700 whitespace-pre-wrap leading-relaxed">
                  {requestPreview.lyricsPrompt}
                </pre>
                {requestPreview.lyricsSuggestedTitle && (
                  <p className="text-xs text-stone-600">
                    Suggested title from lyrics API:{" "}
                    <span className="text-stone-900">{requestPreview.lyricsSuggestedTitle}</span>{" "}
                    (your title above is still used for the track)
                  </p>
                )}
                <div className="text-xs text-stone-400 font-mono pt-1">
                  lyrics task: {requestPreview.lyricsTaskId}
                </div>
              </div>

              <div className="border border-stone-300/90 rounded-lg bg-white/50 p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="text-xs text-stone-500">Lyrics returned (used as custom-mode music prompt)</div>
                  <div className="text-xs text-stone-400 font-mono truncate max-w-[55%]">
                    music cb: {requestPreview.musicCallBackUrl}
                  </div>
                </div>
                <pre className="text-xs text-stone-700 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                  {requestPreview.lyricsPreview}
                </pre>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Form — workbook sections, scroll the page ── */
        <form
          onSubmit={handleGenerate}
          className="animate-fade-up space-y-14 sm:space-y-16 pb-8"
          style={{ animationDelay: "200ms", animationFillMode: "both" }}
        >
          {isAuthed && billingStatusLoading ? (
            <div className="flex items-center gap-2 text-xs text-stone-500 border-b border-dashed border-stone-300 pb-3">
              <span className="inline-flex w-2 h-2 rounded-full bg-stone-400 animate-pulse" />
              Checking subscription…
            </div>
          ) : null}
          {error && (
            <div className="border-l-4 border-red-500 bg-red-50 text-red-800 px-4 py-3 text-sm animate-fade-up">
              {error}
            </div>
          )}

          <section className="space-y-4 scroll-mt-24">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
              1 · Lesson details
            </h2>
            <div className="space-y-6">
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-stone-800 mb-1">
                  Subject / topic
                </label>
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder='e.g. "Biology — Plant Cells"'
                  className={fieldUnderline}
                />
              </div>
              <div>
                <label htmlFor="keyPoints" className="block text-sm font-medium text-stone-800 mb-1">
                  Key learning points
                </label>
                <p className="text-xs text-stone-500 mb-2">
                  Main ideas for the lesson — the lyrics model turns these into song lines (paraphrased, not a copy-paste).
                </p>
                <textarea
                  id="keyPoints"
                  value={keyPoints}
                  onChange={(e) => setKeyPoints(e.target.value)}
                  placeholder={`e.g.\n- Photosynthesis converts sunlight into energy\n- It happens in the chloroplasts\n- CO2 + H2O + sunlight → glucose + oxygen\n- Chlorophyll gives plants their green color`}
                  rows={6}
                  maxLength={450}
                  className={`${fieldBox} resize-none`}
                />
                <div className="flex justify-end mt-1">
                  <span className={`text-xs tabular-nums font-mono ${keyPoints.length > 400 ? "text-amber-700" : "text-stone-400"}`}>
                    {keyPoints.length}/450
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4 pt-4 border-t border-stone-300/80 scroll-mt-24">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
              2 · Sound &amp; inspiration
            </h2>
            <StyleSelector
              value={style}
              customText={customStyleText}
              onChange={handleStyleChange}
              onCustomTextChange={setCustomStyleText}
            />

            {style && style !== CUSTOM_VIBE_ID ? (
              <ArtistInspirationPicker
                vibeId={style}
                value={artistId}
                onChange={(id) => {
                  setArtistId(id);
                }}
              />
            ) : null}

            <div className="space-y-2 pt-2">
              <label className="block text-sm font-medium text-stone-800">
                Voice
              </label>
              <VoiceSelector value={vocalGender} onChange={setVocalGender} />
            </div>
          </section>

          <section className="pt-6 scroll-mt-24">
            <GlassButton
              type="submit"
              disabled={shouldDisableGenerate}
              size="lg"
            >
              Generate song
            </GlassButton>
          </section>
        </form>
      )}

      {/* Paywall modal (only opens on Generate click when not entitled) */}
      {paywallOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-10 bg-stone-900/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-xl border border-stone-300 bg-[#f7f5ef] p-6 sm:p-8 shadow-xl">
              <button
                type="button"
                onClick={() => setPaywallOpen(false)}
                className="absolute top-4 right-4 inline-flex items-center justify-center w-9 h-9 rounded-lg border border-stone-300 bg-white text-stone-600 hover:bg-stone-50 transition"
                aria-label="Close"
              >
                <span aria-hidden>✕</span>
              </button>

              <div className="relative max-w-xl pr-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-stone-300 bg-white text-xs text-stone-600 mb-4">
                  <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
                  Subscription required
                </div>

                <h2 className="text-2xl sm:text-3xl font-semibold text-stone-900 mt-1 mb-3 leading-tight">
                  Start your 7‑day free trial
                </h2>
                <p className="text-stone-600 mb-5 sm:mb-6 leading-relaxed">
                  Unlock unlimited song generation and save everything to your library.
                  Then it’s <span className="text-stone-900 font-medium">$22 AUD/month</span>.
                </p>

                {billingError ? (
                  <div className="mb-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2 animate-fade-in">
                    {billingError}
                  </div>
                ) : null}

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <button
                    type="button"
                    disabled={checkoutLoading || billingStatusLoading || !subscriptionKnown}
                    onClick={async () => {
                      setBillingError("");
                      setCheckoutLoading(true);
                      try {
                        saveCreateFormDraft({
                          subject,
                          keyPoints,
                          style,
                          customStyleText,
                          artistId,
                          vocalGender,
                        });
                        const res = await fetch("/api/stripe/checkout", { method: "POST" });
                        const j = await res.json();
                        if (!res.ok) throw new Error(j?.error || "Failed to start checkout");
                        if (j?.url) window.location.href = j.url;
                        else throw new Error("No checkout URL returned");
                      } catch (e) {
                        setBillingError(e instanceof Error ? e.message : "Checkout error");
                        setCheckoutLoading(false);
                      }
                    }}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-gradient-to-r from-gold to-gold-dark text-black font-semibold hover:brightness-105 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkoutLoading ? "Redirecting…" : "Start free trial"}
                  </button>
                  <div className="text-sm text-stone-500">
                    Cancel anytime during the trial.
                  </div>
                </div>

                <ul className="text-sm text-stone-600 space-y-2 pt-5 border-t border-stone-300 mt-5">
                  <li>Unlimited generations</li>
                  <li>Save to your library</li>
                  <li>V5 model + styles</li>
                </ul>
              </div>
          </div>
        </div>
      ) : null}
      </div>
    </>
  );
}

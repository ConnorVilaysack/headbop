"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
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

interface GeneratedSong {
  id: string;
  title: string;
  subject: string;
  style: string;
  artistInspiration?: string | null;
  audioUrl: string | null;
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
  const [title, setTitle] = useState("");
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
      d.title.trim() ||
      d.subject.trim() ||
      d.keyPoints.trim() ||
      d.style ||
      d.customStyleText?.trim() ||
      d.artistId;
    if (!hasContent) return;
    draftRestoreDone.current = true;
    setTitle(d.title);
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
        !title.trim() ||
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
            title: title.trim(),
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
      title,
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
    setTitle("");
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
      {/* Hero */}
      <div className="text-center mb-12 animate-fade-up">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-5 tracking-tight leading-[1.1]">
          Turn Lessons Into
          <br />
          <span className="bg-gradient-to-r from-gold via-gold-light to-purple-light bg-clip-text text-transparent animate-gradient-shift">
            Unforgettable Music
          </span>
        </h1>
        <p className="text-white/50 text-lg max-w-xl mx-auto leading-relaxed">
          Drop in your key concepts, pick a vibe, and let AI compose a track
          your students will have stuck in their heads all week.
        </p>
        {restoredDraftNotice ? (
          <div className="mt-6 max-w-xl mx-auto flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-left animate-fade-up">
            <span className="text-emerald-400 text-lg leading-none mt-0.5" aria-hidden>
              ✓
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/90 font-medium">Your song details were restored</p>
              <p className="text-xs text-white/50 mt-0.5">
                We kept your title, topic, and key points from before checkout. You can edit or generate when you&apos;re ready.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRestoredDraftNotice(false)}
              className="text-white/40 hover:text-white text-xs shrink-0 px-1"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        ) : null}
      </div>

      {showAuthGate ? (
        <div className="relative animate-scale-in">
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-purple/35 via-gold/30 to-purple/35" />
          <div className="relative rounded-2xl border border-white/[0.08] bg-[#0A0A0A]/95 p-6 sm:p-8 overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-grid-fine opacity-30" />
            <div className="relative max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.12] bg-white/[0.04] text-xs text-white/70 mb-4">
                <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
                Account required
              </div>

              <h2 className="text-2xl sm:text-3xl font-semibold text-white mt-1 mb-3 leading-tight">
                Sign in to create and save songs
              </h2>
              <p className="text-white/50 mb-5 sm:mb-6 max-w-xl leading-relaxed">
                Your tracks are saved to your personal library so you can reuse them for future lessons.
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5 sm:mb-6">
                <Link
                  href="/auth"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-black font-semibold hover:brightness-110 transition-all duration-300 hover:shadow-[0_0_28px_rgba(253,185,39,0.2)]"
                >
                  Sign in / Sign up
                </Link>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 pt-1">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm text-white/70">
                  Pick a vibe and artist inspiration
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm text-white/70">
                  AI writes lyrics from your lesson points
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm text-white/70">
                  Generate, play, and save to your account
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Completed ── */}
      {showAuthGate ? null : generatedSong?.status === "completed" && generatedSong.audioUrl ? (
        <div className="animate-scale-in">
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute -inset-[1px] bg-gradient-to-r from-purple/40 via-gold/30 to-purple/40 rounded-2xl" />
            <div className="relative bg-[#0A0A0A] rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/[0.06] rounded-full text-sm text-white/80 font-medium mb-4">
                  <svg className="w-4 h-4 text-gold" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                  Track Ready
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">{generatedSong.title}</h2>
                <p className="text-white/40 mt-1 capitalize">
                  {generatedSong.subject} &middot; {getVibeLabel(generatedSong.style)}
                  {generatedSong.artistInspiration ? (
                    <> &middot; {generatedSong.artistInspiration}</>
                  ) : null}
                </p>
              </div>

              <AudioPlayer
                src={generatedSong.audioUrl}
                title={generatedSong.title}
                style={getVibeLabel(generatedSong.style)}
                lyrics={generatedSong.lyrics}
              />

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleReset}
                  className="flex-1 px-6 py-3.5 bg-white/[0.06] hover:bg-white/[0.1] text-white font-medium rounded-xl transition-all duration-300 cursor-pointer"
                >
                  Create Another
                </button>
                {generatedSong.audioUrl && (
                  <a
                    href={generatedSong.audioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-gold to-gold-dark text-black font-semibold rounded-xl transition-all duration-300 text-center hover:shadow-[0_0_30px_rgba(253,185,39,0.2)]"
                  >
                    Download MP3
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : isGenerating ? (
        <div className="bg-[#0A0A0A] rounded-2xl border border-white/[0.06] p-6 sm:p-8 animate-scale-in">
          <GeneratingAnimation />
          {requestPreview && (
            <div className="mt-6 space-y-3 animate-fade-up">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">
                  What we sent to the model
                </h3>
                <span className="text-xs text-white/30 font-mono">
                  {requestPreview.model} · customMode={String(requestPreview.customMode)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                  <div className="text-xs text-white/40">Inspiration (your pick)</div>
                  <div className="text-sm text-white mt-0.5">{requestPreview.artistTitle}</div>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                  <div className="text-xs text-white/40">Style (music API)</div>
                  <div className="text-sm text-white mt-0.5">{requestPreview.style}</div>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                  <div className="text-xs text-white/40">Voice</div>
                  <div className="text-sm text-white mt-0.5">
                    {requestPreview.vocalGender === "m"
                      ? "Male"
                      : requestPreview.vocalGender === "f"
                      ? "Female"
                      : "Any"}
                  </div>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                  <div className="text-xs text-white/40">Style strength</div>
                  <div className="text-sm text-white mt-0.5 font-mono">
                    {requestPreview.styleWeight.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                <div className="text-xs text-white/40">Descriptors sent (voice + production)</div>
                <p className="text-sm text-white/70 mt-1">{requestPreview.referenceStyle}</p>
              </div>

              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <div className="text-xs text-white/40 mb-2">Key points received</div>
                <ul className="space-y-1.5">
                  {requestPreview.usedPoints.map((p, idx) => (
                    <li key={idx} className="text-sm text-white/70">
                      <span className="text-white/30 mr-2">-</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
                <div className="text-xs text-white/40">Lyrics API prompt ({requestPreview.lyricsPrompt.length} / 200 chars)</div>
                <p className="text-[11px] text-white/30">
                  KIE caps this field at ~200 characters; we compress your topic and points automatically.
                </p>
                <pre className="text-xs text-white/60 whitespace-pre-wrap leading-relaxed">
                  {requestPreview.lyricsPrompt}
                </pre>
                {requestPreview.lyricsSuggestedTitle && (
                  <p className="text-xs text-white/45">
                    Suggested title from lyrics API:{" "}
                    <span className="text-white/70">{requestPreview.lyricsSuggestedTitle}</span>{" "}
                    (your title above is still used for the track)
                  </p>
                )}
                <div className="text-xs text-white/25 font-mono pt-1">
                  lyrics task: {requestPreview.lyricsTaskId}
                </div>
              </div>

              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="text-xs text-white/40">Lyrics returned (used as custom-mode music prompt)</div>
                  <div className="text-xs text-white/25 font-mono truncate max-w-[55%]">
                    music cb: {requestPreview.musicCallBackUrl}
                  </div>
                </div>
                <pre className="text-xs text-white/60 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                  {requestPreview.lyricsPreview}
                </pre>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Form ── */
        <form
          onSubmit={handleGenerate}
          className="animate-fade-up"
          style={{ animationDelay: "200ms", animationFillMode: "both" }}
        >
          <div className="bg-[#0A0A0A] rounded-2xl border border-white/[0.08] p-6 sm:p-8 space-y-6">
            {isAuthed && billingStatusLoading ? (
              <div className="flex items-center gap-2 text-xs text-white/35 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">
                <span className="inline-flex w-2 h-2 rounded-full bg-white/35 animate-pulse" />
                Checking subscription…
              </div>
            ) : null}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-sm animate-fade-up">
                {error}
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <label htmlFor="title" className="block text-sm font-medium text-white">
                Song Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='e.g. "The Photosynthesis Rap"'
                maxLength={80}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-all duration-300"
              />
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <label htmlFor="subject" className="block text-sm font-medium text-white">
                Subject / Topic
              </label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder='e.g. "Biology — Plant Cells"'
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-all duration-300"
              />
            </div>

            {/* Key Points */}
            <div className="space-y-2">
              <label htmlFor="keyPoints" className="block text-sm font-medium text-white">
                Key Learning Points
              </label>
              <p className="text-xs text-white/40">
                Main ideas for the lesson — KIE&apos;s lyrics API turns these into song lines (paraphrased, not a copy-paste).
              </p>
              <textarea
                id="keyPoints"
                value={keyPoints}
                onChange={(e) => setKeyPoints(e.target.value)}
                placeholder={`e.g.\n- Photosynthesis converts sunlight into energy\n- It happens in the chloroplasts\n- CO2 + H2O + sunlight → glucose + oxygen\n- Chlorophyll gives plants their green color`}
                rows={6}
                maxLength={450}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-all duration-300 resize-none"
              />
              <div className="flex justify-end">
                <span className={`text-xs tabular-nums font-mono ${keyPoints.length > 400 ? "text-gold" : "text-white/25"}`}>
                  {keyPoints.length}/450
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.06]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#0A0A0A] px-4 text-xs text-white/30 uppercase tracking-widest">
                  Choose a vibe
                </span>
              </div>
            </div>

            {/* Style Selector */}
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
                onSuggestedVocal={(v) => {
                  if (v) setVocalGender(v);
                }}
              />
            ) : null}

            {/* Voice Gender */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">
                Voice
              </label>
              <VoiceSelector value={vocalGender} onChange={setVocalGender} />
            </div>

            {/* Generate Button */}
            <button
              type="submit"
              disabled={shouldDisableGenerate}
              className="group relative w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer overflow-hidden bg-gradient-to-r from-gold to-gold-dark text-black hover:shadow-[0_0_40px_rgba(253,185,39,0.2)] hover:brightness-110"
            >
              <span className="flex items-center justify-center gap-2 font-bold tracking-wide">
                <svg
                  className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
                Generate Song
              </span>
            </button>
          </div>
        </form>
      )}

      {/* Paywall modal (only opens on Generate click when not entitled) */}
      {paywallOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-10 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl">
            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-purple/35 via-gold/30 to-purple/35" />
            <div className="relative rounded-2xl border border-white/[0.10] bg-[#0A0A0A]/95 p-6 sm:p-8 overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-grid-fine opacity-25" />
              <button
                type="button"
                onClick={() => setPaywallOpen(false)}
                className="absolute top-4 right-4 inline-flex items-center justify-center w-9 h-9 rounded-lg border border-white/[0.10] bg-white/[0.03] text-white/70 hover:text-white hover:bg-white/[0.06] transition"
                aria-label="Close"
              >
                <span aria-hidden>✕</span>
              </button>

              <div className="relative max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.12] bg-white/[0.04] text-xs text-white/70 mb-4">
                  <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
                  Subscription required
                </div>

                <h2 className="text-2xl sm:text-3xl font-semibold text-white mt-1 mb-3 leading-tight">
                  Start your 7‑day free trial
                </h2>
                <p className="text-white/50 mb-5 sm:mb-6 leading-relaxed">
                  Unlock unlimited song generation and save everything to your library.
                  Then it’s <span className="text-white/80 font-medium">$22 AUD/month</span>.
                </p>

                {billingError ? (
                  <div className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 animate-fade-in">
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
                          title,
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
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-black font-semibold hover:brightness-110 transition-all duration-300 hover:shadow-[0_0_28px_rgba(253,185,39,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkoutLoading ? "Redirecting…" : "Start free trial"}
                  </button>
                  <div className="text-sm text-white/35">
                    Cancel anytime during the trial.
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-3 pt-5">
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm text-white/70">
                    Unlimited generations
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm text-white/70">
                    Save to your library
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm text-white/70">
                    V5 model + styles
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

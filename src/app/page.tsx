"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ArtistInspirationPicker } from "@/components/ArtistInspirationPicker";
import { StyleSelector } from "@/components/StyleSelector";
import { getVibeLabel } from "@/lib/vibes";
import { VoiceSelector } from "@/components/VoiceSelector";
import { GeneratingAnimation } from "@/components/GeneratingAnimation";
import { AudioPlayer } from "@/components/AudioPlayer";

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
  const [artistId, setArtistId] = useState("");
  const [vocalGender, setVocalGender] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSong, setGeneratedSong] = useState<GeneratedSong | null>(null);
  const [requestPreview, setRequestPreview] = useState<RequestPreview | null>(null);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const handleStyleChange = useCallback((v: string) => {
    setStyle(v);
    setArtistId("");
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

      if (!title.trim() || !subject.trim() || !keyPoints.trim() || !style || !artistId) {
        setError("Please fill in all fields, choose a vibe, and pick an inspiration.");
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
            style,
            artistId,
            vocalGender,
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
    [title, subject, keyPoints, style, artistId, vocalGender, pollStatus]
  );

  const handleReset = useCallback(() => {
    stopPolling();
    setTitle("");
    setSubject("");
    setKeyPoints("");
    setStyle("");
    setArtistId("");
    setVocalGender("");
    setGeneratedSong(null);
    setRequestPreview(null);
    setError("");
    setIsGenerating(false);
  }, [stopPolling]);

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
      </div>

      {/* ── Completed ── */}
      {generatedSong?.status === "completed" && generatedSong.audioUrl ? (
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
            <StyleSelector value={style} onChange={handleStyleChange} />

            {style ? (
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
              disabled={isGenerating}
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
    </div>
  );
}

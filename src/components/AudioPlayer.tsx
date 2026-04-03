"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";

interface AudioPlayerProps {
  src: string;
  title: string;
  style?: string;
  compact?: boolean;
  lyrics?: string | null;
  /** Raw “key points” / lesson bullets from the create form. */
  keyPoints?: string | null;
  /** If provided, we can fetch KIE timestamped lyrics and sync word highlighting to audio playback. */
  timestampTaskId?: string | null;
  timestampAudioId?: string | null;
  /** Optional: KIE may align timestamps against the streamed variant. */
  streamSrc?: string | null;
}

function lyricLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^\[(intro|verse|chorus|bridge|outro)/i.test(l));
}

function lyricDisplayLines(raw: string): string[] {
  // Keep section markers and line breaks for display + timing.
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function tokenizeLine(line: string): string[] {
  // Keep bracket markers as a single token; otherwise split on whitespace.
  if (/^\[[^\]]+\]$/.test(line.trim())) return [line.trim()];
  return line
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

export function AudioPlayer({
  src,
  title,
  style,
  compact = false,
  lyrics,
  keyPoints,
  timestampTaskId,
  timestampAudioId,
  streamSrc,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lyricsScrollRef = useRef<HTMLDivElement>(null);
  const lastUserScrollAtRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lyricOffsetLines, setLyricOffsetLines] = useState(0);

  const [timestamped, setTimestamped] = useState<{
    alignedWords: Array<{
      word: string;
      success?: boolean;
      startS: number;
      endS: number;
      palign?: number;
    }>;
    waveformData?: number[];
    hootCer?: number;
    isStreamed?: boolean;
  } | null>(null);
  const [timestampedLoading, setTimestampedLoading] = useState(false);
  const [karaokeTime, setKaraokeTime] = useState<number>(0);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [syncOffsetS, setSyncOffsetS] = useState<number>(0);
  const [syncRate, setSyncRate] = useState<number>(1);

  // Optional: fetch timestamped lyrics only when we have task + audio ids.
  // This avoids extra API calls for the normal generate/play flow.
  useEffect(() => {
    const shouldFetch =
      Boolean(timestampTaskId && timestampTaskId.length > 0) &&
      Boolean(timestampAudioId && timestampAudioId.length > 0) &&
      Boolean(lyrics && lyrics.trim().length > 0);

    if (!shouldFetch) return;
    if (timestamped) return;

    setTimestampedLoading(true);
    fetch("/api/lyrics/timestamped", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: timestampTaskId, audioId: timestampAudioId }),
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Failed to fetch timestamped lyrics");
        setTimestamped(j ?? null);
      })
      .catch((err) => {
        console.warn("Timestamped lyrics fetch failed:", err);
        setTimestamped(null);
      })
      .finally(() => {
        setTimestampedLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timestampTaskId, timestampAudioId, lyrics]);

  const preferredSrc = useMemo(() => {
    // KIE tells us whether alignment corresponds to streaming audio.
    if (timestamped?.isStreamed && streamSrc) return streamSrc;
    return src;
  }, [timestamped?.isStreamed, streamSrc, src]);

  // If we learn we should be using the streamed variant, switch *before* playback starts.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) return;
    if (currentTime > 0.01) return;
    if (a.src !== preferredSrc) {
      a.src = preferredSrc;
      a.load();
    }
  }, [preferredSrc, isPlaying, currentTime]);

  // Per-song sync calibration (stored locally in the browser)
  useEffect(() => {
    if (!timestampTaskId || !timestampAudioId) return;
    const key = `headbop:karo-sync:${timestampTaskId}:${timestampAudioId}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const j = JSON.parse(raw) as { offsetS?: number; rate?: number };
      if (typeof j.offsetS === "number" && Number.isFinite(j.offsetS)) {
        setSyncOffsetS(j.offsetS);
      }
      if (typeof j.rate === "number" && Number.isFinite(j.rate)) {
        setSyncRate(j.rate);
      }
    } catch {
      // ignore
    }
  }, [timestampTaskId, timestampAudioId]);

  useEffect(() => {
    if (!timestampTaskId || !timestampAudioId) return;
    const key = `headbop:karo-sync:${timestampTaskId}:${timestampAudioId}`;
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ offsetS: syncOffsetS, rate: syncRate })
      );
    } catch {
      // ignore
    }
  }, [timestampTaskId, timestampAudioId, syncOffsetS, syncRate]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onLoad = () => setDuration(audio.duration);
    const onEnd = () => setIsPlaying(false);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoad);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoad);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause(); else await audio.play();
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const seek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audio.currentTime = pct * duration;
      setCurrentTime(pct * duration);
    },
    [duration]
  );

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const displayStyle =
    style && style.length > 140 ? `${style.slice(0, 140).trimEnd()}…` : style;
  const lines = lyrics ? lyricLines(lyrics) : [];
  const lessonPhrases = useMemo(() => {
    if (!keyPoints) return [] as string[];
    return keyPoints
      .split(/\r?\n|[.;]/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .map((p) => p.toLowerCase());
  }, [keyPoints]);
  const keyLineSet = useMemo(() => {
    if (!lines.length) return new Set<number>();
    const out = new Set<number>();
    lines.forEach((l, idx) => {
      const norm = l.toLowerCase();
      if (lessonPhrases.some((p) => p && norm.includes(p))) {
        out.add(idx);
      }
    });
    return out;
  }, [lines, lessonPhrases]);
  const baseLineIdx =
    duration && lines.length
      ? Math.min(lines.length - 1, Math.floor((currentTime / duration) * lines.length))
      : 0;
  const lineIdx = Math.max(0, Math.min(lines.length - 1, baseLineIdx + lyricOffsetLines));

  const syncNowToLine = useCallback(
    (targetIndex: number) => {
      if (!duration || !lines.length) return;
      const currentBase =
        Math.min(lines.length - 1, Math.floor((currentTime / duration) * lines.length));
      setLyricOffsetLines(targetIndex - currentBase);
    },
    [currentTime, duration, lines.length]
  );

  const seekToLine = useCallback(
    (targetIndex: number) => {
      const audio = audioRef.current;
      if (!audio || !duration || !lines.length) return;
      const baseIndex = Math.max(0, Math.min(lines.length - 1, targetIndex - lyricOffsetLines));
      const pct = lines.length <= 1 ? 0 : baseIndex / (lines.length - 1);
      audio.currentTime = pct * duration;
      setCurrentTime(pct * duration);
    },
    [duration, lines.length, lyricOffsetLines]
  );

  // Karaoke sync:
  // - Use requestAnimationFrame to sample audio time smoothly (timeupdate is too coarse)
  useEffect(() => {
    if (!timestamped) return;
    const audio = audioRef.current;
    if (!audio) return;

    let raf = 0;
    const tick = () => {
      setKaraokeTime(audio.currentTime || 0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [timestamped]);

  const timestampLines = useMemo(() => {
    if (!timestamped?.alignedWords?.length) return null;
    if (!lyrics || !lyrics.trim()) return null;

    // If KIE reports very high error (low hootCer), its alignment is usually
    // not worth trusting for line-by-line UX. In that case we fall back to
    // gentle auto-scroll without per-line tracking.
    const cer = timestamped.hootCer;
    if (typeof cer === "number" && Number.isFinite(cer) && cer > 0 && cer < 0.55) {
      return null;
    }

    // Flatten KIE alignedWords into a sequential token stream (timed per token).
    const alignedTokens: Array<{ token: string; startS: number; endS: number }> = [];
    for (const w of timestamped.alignedWords) {
      if (!w || w.success === false) continue;
      const raw = String(w.word ?? "");
      const parts = raw
        .split(/\s+/)
        .map((x) => x.trim())
        .filter(Boolean);
      for (const p of parts) {
        alignedTokens.push({ token: p, startS: w.startS, endS: w.endS });
      }
    }
    if (alignedTokens.length === 0) return null;

    // Normalise KIE’s timeline onto the actual audio duration.
    const minAligned = alignedTokens.reduce(
      (m, t) => (t.startS < m ? t.startS : m),
      alignedTokens[0].startS
    );
    const maxAligned = alignedTokens.reduce(
      (m, t) => (t.endS > m ? t.endS : m),
      alignedTokens[0].endS
    );
    const alignedSpan = Math.max(0.001, maxAligned - minAligned);

    // Use the *actual* lyrics line breaks as the source of truth,
    // then assign times by consuming tokens in order, rescaled to [0, duration].
    const display = lyricDisplayLines(lyrics);
    const out: Array<{ text: string; startS: number; endS: number }> = [];
    let cursor = 0;

    for (const line of display) {
      const tokens = tokenizeLine(line);
      if (tokens.length === 0) continue;

      const startTok = alignedTokens[Math.min(cursor, alignedTokens.length - 1)];
      const endTok =
        alignedTokens[Math.min(cursor + tokens.length - 1, alignedTokens.length - 1)];

      const normStart = (startTok.startS - minAligned) / alignedSpan;
      const normEnd = (endTok.endS - minAligned) / alignedSpan;

      out.push({
        text: line,
        startS: duration * Math.max(0, Math.min(1, normStart)),
        endS: duration * Math.max(0, Math.min(1, Math.max(normStart, normEnd))),
      });
      cursor += tokens.length;
    }

    return out.length ? out : null;
  }, [timestamped, lyrics, duration]);

  const activeTimestampLineIdx = useMemo(() => {
    if (!timestampLines?.length) return -1;
    // Apply per-song calibration so line highlighting matches perceived playback.
    const t = Math.max(0, (karaokeTime - syncOffsetS) * syncRate);
    // Binary search: last line with startS <= t
    let lo = 0;
    let hi = timestampLines.length - 1;
    let best = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (t >= timestampLines[mid].startS) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    // Prefer an actual containing interval if possible.
    for (const cand of [best, best + 1, best - 1]) {
      if (cand < 0 || cand >= timestampLines.length) continue;
      const ln = timestampLines[cand];
      if (t >= ln.startS && t <= ln.endS) return cand;
    }
    return best;
  }, [timestampLines, karaokeTime]);

  // When we are not using precise timestamped lines, keep the lyrics gently
  // scrolling in sync with the overall song progress so kids can follow along
  // without needing perfect word-level timing.
  useEffect(() => {
    if (!lyricsScrollRef.current) return;
    if (!duration || !lines.length) return;
    if (timestampLines && timestampLines.length > 0) return;
    const el = lyricsScrollRef.current;
    const now = performance.now();
    if (
      lastUserScrollAtRef.current !== null &&
      now - lastUserScrollAtRef.current < 2500
    ) {
      return;
    }
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) return;
    const pct = Math.max(0, Math.min(1, currentTime / duration));
    el.scrollTop = maxScroll * pct;
  }, [currentTime, duration, lines.length, timestampLines]);

  const handleLyricsScroll = useCallback(() => {
    lastUserScrollAtRef.current = performance.now();
  }, []);

  const renderHighlightedLine = useCallback(
    (line: string, isKey: boolean) => {
      if (!isKey || !lessonPhrases.length) return line;
      type Segment = { text: string; highlight: boolean };
      let segments: Segment[] = [{ text: line, highlight: false }];
      for (const phrase of lessonPhrases) {
        if (!phrase) continue;
        const next: Segment[] = [];
        for (const seg of segments) {
          if (seg.highlight) {
            next.push(seg);
            continue;
          }
          const lower = seg.text.toLowerCase();
          let start = 0;
          let idx = lower.indexOf(phrase, start);
          if (idx === -1) {
            next.push(seg);
            continue;
          }
          while (idx !== -1) {
            if (idx > start) {
              next.push({
                text: seg.text.slice(start, idx),
                highlight: false,
              });
            }
            next.push({
              text: seg.text.slice(idx, idx + phrase.length),
              highlight: true,
            });
            start = idx + phrase.length;
            idx = lower.indexOf(phrase, start);
          }
          if (start < seg.text.length) {
            next.push({
              text: seg.text.slice(start),
              highlight: false,
            });
          }
        }
        segments = next;
      }
      return segments.map((seg, i) =>
        seg.highlight ? (
          <span
            key={i}
            className="font-extrabold text-purple bg-gold/40 px-1 rounded-sm"
          >
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      );
    },
    [lessonPhrases]
  );

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <audio ref={audioRef} src={preferredSrc} preload="metadata" />
        <button
          onClick={togglePlay}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 cursor-pointer ${
            isPlaying
              ? "bg-gold text-black"
              : "bg-stone-200 text-stone-800 hover:bg-stone-300"
          }`}
        >
          {isPlaying ? (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
          ) : (
            <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="h-1 bg-stone-200 rounded-full cursor-pointer relative overflow-hidden group" onClick={seek}>
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple to-gold rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span className="text-[11px] text-stone-500 tabular-nums shrink-0 font-mono">
          {fmt(currentTime)}/{fmt(duration)}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/70 border border-stone-300 rounded-xl p-6 shadow-sm animate-scale-in">
      <audio ref={audioRef} src={preferredSrc} preload="metadata" />

      <div className="flex items-center gap-5 mb-5">
        <button
          onClick={togglePlay}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 cursor-pointer ${
            isPlaying
              ? "bg-gold text-black shadow-[0_0_30px_rgba(253,185,39,0.25)] scale-105"
              : "bg-gradient-to-br from-gold to-gold-dark text-black hover:shadow-[0_0_25px_rgba(253,185,39,0.2)] hover:scale-105"
          }`}
        >
          {isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
          ) : (
            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>

        {/* Waveform */}
        <div className="flex-1 flex items-center gap-[2px] h-10">
          {Array.from({ length: 40 }).map((_, i) => {
            const filled = i / 40 < progress / 100;
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-all duration-150 ${
                  filled ? "bg-gradient-to-t from-purple to-gold" : "bg-stone-200/80"
                } ${isPlaying && filled ? "animate-wave" : ""}`}
                style={{
                  height: `${Math.round(25 + Math.sin(i * 0.7) * 35 + Math.cos(i * 1.3) * 25)}%`,
                  animationDelay: isPlaying ? `${i * 30}ms` : undefined,
                  minHeight: "4px",
                }}
              />
            );
          })}
        </div>

        <div className="hidden sm:block text-right shrink-0">
          <p className="font-medium text-stone-900 text-sm truncate max-w-[160px]">
            {title}
          </p>
        </div>
      </div>

      {/* Seek */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-stone-500 tabular-nums w-10 text-right font-mono">{fmt(currentTime)}</span>
        <div className="flex-1 h-1 bg-stone-200 rounded-full cursor-pointer relative overflow-hidden group" onClick={seek}>
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple via-purple-light to-gold rounded-full"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gold shadow-[0_0_10px_rgba(253,185,39,0.5)] opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>
        <span className="text-[11px] text-stone-500 tabular-nums w-10 font-mono">{fmt(duration)}</span>
      </div>

      {timestampTaskId && timestampAudioId ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowDiagnostics((v) => !v)}
            className="text-xs text-stone-500 hover:text-stone-800 underline decoration-stone-300 underline-offset-2"
          >
            {showDiagnostics ? "Hide sync diagnostics" : "Show sync diagnostics"}
          </button>
          {showDiagnostics ? (
            <div className="mt-3 rounded-lg border border-stone-200 bg-white/70 p-3 text-xs text-stone-700">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] text-stone-500">taskId</div>
                  <div className="font-mono break-all">{timestampTaskId}</div>
                </div>
                <div>
                  <div className="text-[11px] text-stone-500">audioId</div>
                  <div className="font-mono break-all">{timestampAudioId}</div>
                </div>
                <div>
                  <div className="text-[11px] text-stone-500">playing src</div>
                  <div className="font-mono break-all">{audioRef.current?.currentSrc || src}</div>
                </div>
                <div>
                  <div className="text-[11px] text-stone-500">KIE alignment</div>
                  <div className="font-mono">
                    isStreamed={String(timestamped?.isStreamed ?? "unknown")} · hootCer=
                    {typeof timestamped?.hootCer === "number"
                      ? timestamped.hootCer.toFixed(3)
                      : "unknown"}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <div className="font-mono text-stone-500">
                  t={karaokeTime.toFixed(2)}s · calT={Math.max(0, (karaokeTime - syncOffsetS) * syncRate).toFixed(2)}s · duration={duration ? duration.toFixed(2) : "?"}s
                </div>
                <button
                  type="button"
                  className="px-2 py-1 rounded-md border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 transition w-fit"
                  onClick={async () => {
                    const payload = {
                      taskId: timestampTaskId,
                      audioId: timestampAudioId,
                      currentSrc: audioRef.current?.currentSrc || src,
                      isStreamed: timestamped?.isStreamed ?? null,
                      hootCer: timestamped?.hootCer ?? null,
                    };
                    try {
                      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
                    } catch {
                      // ignore
                    }
                  }}
                >
                  Copy diagnostics
                </button>
              </div>

              <div className="mt-4 rounded-md border border-stone-200 bg-white/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] text-stone-500">Lyric sync calibration</div>
                    <div className="text-xs text-stone-700">
                      If KIE alignment is imperfect (low hootCer), adjust once and we’ll remember it for this song.
                    </div>
                  </div>
                  <button
                    type="button"
                    className="px-2 py-1 rounded-md border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 transition shrink-0"
                    onClick={() => {
                      setSyncOffsetS(0);
                      setSyncRate(1);
                    }}
                  >
                    Reset
                  </button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-stone-500">Offset (seconds)</span>
                      <span className="font-mono text-[11px] text-stone-600">{syncOffsetS.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={-2}
                      max={2}
                      step={0.05}
                      value={syncOffsetS}
                      onChange={(e) => setSyncOffsetS(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="mt-1 text-[11px] text-stone-500">
                      If highlight is early, increase offset. If late, decrease.
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-stone-500">Rate</span>
                      <span className="font-mono text-[11px] text-stone-600">{syncRate.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.95}
                      max={1.05}
                      step={0.001}
                      value={syncRate}
                      onChange={(e) => setSyncRate(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="mt-1 text-[11px] text-stone-500">
                      Use only if it drifts over time (usually keep at 1.000).
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      </div>

      {lyrics && lines.length > 0 && (
        <div className="bg-white/70 border border-stone-300 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-medium text-stone-600 uppercase tracking-wider">
              Lyrics
            </h3>
            <div className="flex items-center gap-2">
              {!timestamped ? (
                <button
                  type="button"
                  onClick={() => setLyricOffsetLines((v) => v - 1)}
                  className="px-2 py-1 rounded-lg bg-white border border-stone-300 text-stone-700 text-xs hover:bg-stone-50 transition-colors cursor-pointer"
                  title="Lyrics earlier"
                >
                  −
                </button>
              ) : null}
              <span className="text-xs text-stone-500 font-mono">
                {fmt(currentTime)} / {fmt(duration)}
              </span>
              {!timestamped ? (
                <button
                  type="button"
                  onClick={() => setLyricOffsetLines((v) => v + 1)}
                  className="px-2 py-1 rounded-lg bg-white border border-stone-300 text-stone-700 text-xs hover:bg-stone-50 transition-colors cursor-pointer"
                  title="Lyrics later"
                >
                  +
                </button>
              ) : null}
            </div>
          </div>

          <div
            ref={lyricsScrollRef}
            className="max-h-[52vh] overflow-y-auto pr-2"
            onScroll={handleLyricsScroll}
          >
            {timestampLines ? (
              <div className="space-y-3">
                {timestampLines.map((ln, i) => {
                  const isSection = /^\[(intro|verse|chorus|bridge|outro)/i.test(ln.text);
                  const active = i === activeTimestampLineIdx;
                  const isKey = keyLineSet.has(i);
                  return (
                    <div
                      key={`${i}-${ln.startS}`}
                      className={
                        isSection
                          ? "text-sm font-semibold uppercase tracking-[0.18em] text-stone-500 pt-4"
                          : `text-2xl sm:text-4xl leading-snug cursor-pointer select-none transition-colors ${
                              active
                                ? "text-stone-900 bg-gold/20 rounded-md px-2 py-1"
                                : isKey
                                  ? "text-stone-900 font-semibold"
                                  : "text-stone-700"
                            }`
                      }
                      onClick={() => {
                        const audio = audioRef.current;
                        if (!audio) return;
                        audio.currentTime = Math.max(0, ln.startS);
                        setCurrentTime(Math.max(0, ln.startS));
                      }}
                      title={isSection ? undefined : "Click to jump to this line"}
                    >
                      {renderHighlightedLine(ln.text, isKey)}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {lines.map((l, i) => {
                  const isKey = keyLineSet.has(i);
                  return (
                    <div
                      key={i}
                      className={`text-2xl sm:text-4xl leading-snug cursor-pointer select-none transition-colors ${
                        isKey ? "text-stone-900 font-semibold" : "text-stone-700"
                      }`}
                      onClick={() => seekToLine(i)}
                      onDoubleClick={() => syncNowToLine(i)}
                      title="Click: jump. Double-click: sync this line to now."
                    >
                      {renderHighlightedLine(l, isKey)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="text-[11px] text-stone-500 mt-4">
            {timestampedLoading
              ? "Getting precise lyrics timing…"
              : timestampLines
                ? "Lyrics follow the song line-by-line."
                : "Tip: lyrics have no timestamps. Click a line to jump; double-click to sync that line to the current moment."}
          </p>
        </div>
      )}
    </div>
  );
}

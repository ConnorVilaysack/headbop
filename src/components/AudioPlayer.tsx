"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface AudioPlayerProps {
  src: string;
  title: string;
  style?: string;
  compact?: boolean;
  lyrics?: string | null;
}

function lyricLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^\[(intro|verse|chorus|bridge|outro)/i.test(l));
}

export function AudioPlayer({ src, title, style, compact = false, lyrics }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lyricOffsetLines, setLyricOffsetLines] = useState(0);
  const activeLineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onLoad = () => setDuration(audio.duration);
    const onEnd = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoad);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoad);
      audio.removeEventListener("ended", onEnd);
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
  const lines = lyrics ? lyricLines(lyrics) : [];
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

  useEffect(() => {
    if (!isPlaying) return;
    activeLineRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [isPlaying, lineIdx]);

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <audio ref={audioRef} src={src} preload="metadata" />
        <button
          onClick={togglePlay}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 cursor-pointer ${
            isPlaying
              ? "bg-gold text-black"
              : "bg-white/[0.08] text-white hover:bg-white/[0.15]"
          }`}
        >
          {isPlaying ? (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
          ) : (
            <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="h-1 bg-white/[0.08] rounded-full cursor-pointer relative overflow-hidden group" onClick={seek}>
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple to-gold rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span className="text-[11px] text-white/30 tabular-nums shrink-0 font-mono">
          {fmt(currentTime)}/{fmt(duration)}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 animate-scale-in">
      <audio ref={audioRef} src={src} preload="metadata" />

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
                  filled ? "bg-gradient-to-t from-purple to-gold" : "bg-white/[0.06]"
                } ${isPlaying && filled ? "animate-wave" : ""}`}
                style={{
                  height: `${25 + Math.sin(i * 0.7) * 35 + Math.cos(i * 1.3) * 25}%`,
                  animationDelay: isPlaying ? `${i * 30}ms` : undefined,
                  minHeight: "4px",
                }}
              />
            );
          })}
        </div>

        <div className="hidden sm:block text-right shrink-0">
          <p className="font-medium text-white text-sm truncate max-w-[160px]">{title}</p>
          {style && <p className="text-xs text-white/30 capitalize">{style}</p>}
        </div>
      </div>

      {/* Seek */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-white/30 tabular-nums w-10 text-right font-mono">{fmt(currentTime)}</span>
        <div className="flex-1 h-1 bg-white/[0.06] rounded-full cursor-pointer relative overflow-hidden group" onClick={seek}>
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple via-purple-light to-gold rounded-full"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gold shadow-[0_0_10px_rgba(253,185,39,0.5)] opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>
        <span className="text-[11px] text-white/30 tabular-nums w-10 font-mono">{fmt(duration)}</span>
      </div>
      </div>

      {lyrics && lines.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider">
              Lyrics
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLyricOffsetLines((v) => v - 1)}
                className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/70 text-xs hover:bg-white/[0.08] transition-colors cursor-pointer"
                title="Lyrics earlier"
              >
                −
              </button>
              <span className="text-xs text-white/30 font-mono">
                {fmt(currentTime)} / {fmt(duration)}
              </span>
              <button
                type="button"
                onClick={() => setLyricOffsetLines((v) => v + 1)}
                className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/70 text-xs hover:bg-white/[0.08] transition-colors cursor-pointer"
                title="Lyrics later"
              >
                +
              </button>
            </div>
          </div>

          <div className="max-h-[46vh] overflow-y-auto pr-2">
            <div className="space-y-3">
              {lines.map((l, i) => {
                const active = i === lineIdx && isPlaying;
                return (
                  <div
                    key={i}
                    ref={active ? activeLineRef : null}
                    className={`text-2xl sm:text-3xl leading-snug transition-colors duration-200 cursor-pointer select-none ${
                      active ? "text-white" : "text-white/35"
                    }`}
                    onClick={() => seekToLine(i)}
                    onDoubleClick={() => syncNowToLine(i)}
                    title="Click: jump. Double-click: sync this line to now."
                  >
                    {l}
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-white/30 mt-4">
            Tip: lyrics have no timestamps. Click a line to jump; double-click to sync that line to the current moment.
          </p>
        </div>
      )}
    </div>
  );
}

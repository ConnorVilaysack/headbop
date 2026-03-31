"use client";

import { useState, useEffect, useCallback } from "react";
import { SongCard, SongData } from "@/components/SongCard";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LibraryPage() {
  const [songs, setSongs] = useState<SongData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [needsAuth, setNeedsAuth] = useState(false);

  const fetchSongs = useCallback(async () => {
    try {
      const res = await fetch("/api/songs");
      if (res.status === 401) {
        setNeedsAuth(true);
        return;
      }
      if (res.ok) setSongs(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setNeedsAuth(true);
      setLoading(false);
      return;
    }
    supabase.auth
      .getUser()
      .then((result) => {
        setNeedsAuth(!result.data.user);
        setLoading(false);
      })
      .catch(() => {
        setNeedsAuth(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => { fetchSongs(); }, [fetchSongs]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this song from your library?")) return;
    try {
      const res = await fetch(`/api/songs/${id}`, { method: "DELETE" });
      if (res.ok) setSongs((prev) => prev.filter((s) => s.id !== id));
    } catch { /* ignore */ }
  }, []);

  const filteredSongs = filter
    ? songs.filter((s) =>
        s.title.toLowerCase().includes(filter.toLowerCase()) ||
        s.subject.toLowerCase().includes(filter.toLowerCase()) ||
        s.style.toLowerCase().includes(filter.toLowerCase())
      )
    : songs;

  const completedSongs = filteredSongs.filter((s) => s.status === "completed");
  const inProgressSongs = filteredSongs.filter((s) => s.status === "generating");

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 sm:py-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10 animate-fade-up">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Your Library
          </h1>
          <p className="text-white/40 mt-2">
            {songs.length} track{songs.length !== 1 && "s"} in your collection
          </p>
        </div>

        <div className="relative group">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 group-focus-within:text-white/50 transition-colors duration-300"
            fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search songs..."
            className="pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-all duration-300 w-full sm:w-72"
          />
        </div>
      </div>

      {needsAuth ? (
        <div className="text-center py-24 animate-fade-up">
          <h2 className="text-xl font-semibold text-white mb-2">Sign in to view your library</h2>
          <p className="text-white/40 mb-8 max-w-sm mx-auto">
            Your tracks are now tied to your account.
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold to-gold-dark text-black font-semibold rounded-xl"
          >
            Go to Sign in
          </Link>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-6 animate-fade-in">
          <div className="flex items-end gap-1.5 h-10">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-1.5 bg-gradient-to-t from-purple to-gold rounded-full animate-bar-dance"
                style={{ height: "100%", animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>
          <p className="text-white/30 text-sm">Loading your tracks...</p>
        </div>
      ) : songs.length === 0 ? (
        <div className="text-center py-24 animate-fade-up">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-[-20%] rounded-full bg-purple/10 blur-2xl" />
            <div className="relative w-full h-full bg-[#0A0A0A] rounded-2xl border border-white/[0.06] flex items-center justify-center">
              <svg className="w-10 h-10 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No tracks yet</h2>
          <p className="text-white/40 mb-8 max-w-sm mx-auto">
            Create your first AI-generated educational track and it&apos;ll show up here.
          </p>
          <Link
            href="/"
            className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold to-gold-dark text-black font-semibold rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(253,185,39,0.2)] hover:scale-[1.02]"
          >
            <svg className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create a Track
          </Link>
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="text-center py-24 animate-fade-up">
          <p className="text-white/40">
            No tracks match &quot;<span className="text-white/70">{filter}</span>&quot;
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {inProgressSongs.length > 0 && (
            <div>
              <h2 className="text-xs font-medium text-white/40 uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                In Progress
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {inProgressSongs.map((song, i) => (
                  <SongCard key={song.id} song={song} onDelete={handleDelete} index={i} />
                ))}
              </div>
            </div>
          )}

          {completedSongs.length > 0 && (
            <div>
              {inProgressSongs.length > 0 && (
                <h2 className="text-xs font-medium text-white/40 uppercase tracking-[0.2em] mb-5">Completed</h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {completedSongs.map((song, i) => (
                  <SongCard key={song.id} song={song} onDelete={handleDelete} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

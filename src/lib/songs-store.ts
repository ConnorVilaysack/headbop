import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

type SongRow = {
  id: string;
  user_id: string | null;
  title: string;
  subject: string;
  key_points: string;
  style: string;
  artist_inspiration: string | null;
  prompt: string;
  lyrics: string | null;
  audio_url: string | null;
  image_url: string | null;
  duration: number | null;
  task_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Song = {
  id: string;
  userId: string | null;
  title: string;
  subject: string;
  keyPoints: string;
  style: string;
  artistInspiration: string | null;
  prompt: string;
  lyrics: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  duration: number | null;
  taskId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

function toSong(row: SongRow): Song {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    subject: row.subject,
    keyPoints: row.key_points,
    style: row.style,
    artistInspiration: row.artist_inspiration,
    prompt: row.prompt,
    lyrics: row.lyrics,
    audioUrl: row.audio_url,
    imageUrl: row.image_url,
    duration: row.duration,
    taskId: row.task_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  }
  return createClient(url, secret, { auth: { persistSession: false } });
}

export async function createSong(input: {
  userId: string;
  title: string;
  subject: string;
  keyPoints: string;
  style: string;
  artistInspiration: string | null;
  prompt: string;
  taskId: string | null;
  status: string;
}): Promise<Song> {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("songs")
    .insert({
      id: randomUUID(),
      user_id: input.userId,
      title: input.title,
      subject: input.subject,
      key_points: input.keyPoints,
      style: input.style,
      artist_inspiration: input.artistInspiration,
      prompt: input.prompt,
      task_id: input.taskId,
      status: input.status,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message || "Failed to create song");
  return toSong(data as SongRow);
}

export async function listSongsByUser(userId: string): Promise<Song[]> {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toSong(r as SongRow));
}

export async function getSongByIdForUser(userId: string, id: string): Promise<Song | null> {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? toSong(data as SongRow) : null;
}

export async function deleteSongByIdForUser(userId: string, id: string): Promise<void> {
  const supabase = adminClient();
  const { error } = await supabase.from("songs").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function getSongByTaskForUser(
  userId: string,
  taskId: string
): Promise<Song | null> {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .eq("task_id", taskId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? toSong(data as SongRow) : null;
}

export async function updateSongByTask(
  taskId: string,
  patch: Partial<{
    audioUrl: string | null;
    imageUrl: string | null;
    lyrics: string | null;
    duration: number | null;
    status: string;
  }>
): Promise<void> {
  const supabase = adminClient();
  const update: Record<string, unknown> = {};
  if ("audioUrl" in patch) update.audio_url = patch.audioUrl;
  if ("imageUrl" in patch) update.image_url = patch.imageUrl;
  if ("lyrics" in patch) update.lyrics = patch.lyrics;
  if ("duration" in patch) update.duration = patch.duration;
  if ("status" in patch) update.status = patch.status;

  const { error } = await supabase.from("songs").update(update).eq("task_id", taskId);
  if (error) throw new Error(error.message);
}


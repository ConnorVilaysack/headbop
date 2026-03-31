import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { listSongsByUser } from "@/lib/songs-store";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const songs = await listSongsByUser(user.id);
    return NextResponse.json(songs);
  } catch (error) {
    console.error("Fetch songs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch songs" },
      { status: 500 }
    );
  }
}

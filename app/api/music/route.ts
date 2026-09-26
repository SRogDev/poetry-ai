// GET /api/music — bundled free music tracks (public, optional).
import { NextResponse } from "next/server";
import { MUSIC_TRACKS } from "@/lib/music/tracks";

export async function GET() {
  return NextResponse.json({ tracks: MUSIC_TRACKS });
}

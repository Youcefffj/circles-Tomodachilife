import { NextResponse } from "next/server";

import { getRedis, USERS_SET_KEY } from "@/lib/server/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/users
 *
 * Returns every address that has ever signed in or saved progress with
 * Hatch — the global directory used by the leaderboard. Anyone can read
 * (the addresses are public on-chain anyway, no auth needed).
 */
export async function GET() {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { ok: false, error: "users backend not configured", users: [] },
      { status: 503 },
    );
  }

  const members = await redis.smembers(USERS_SET_KEY);
  return NextResponse.json(
    { ok: true, users: members ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}

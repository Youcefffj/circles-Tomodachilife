import { NextResponse } from "next/server";

import { CHAT_LIST_KEY, getRedis } from "@/lib/server/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // never cache the feed

/**
 * GET /api/chat/messages?since=<unixMs>
 *
 * Returns the most recent chat messages in chronological order (oldest first).
 * `since` filters to messages strictly newer than that timestamp — used by
 * the frontend polling loop to fetch deltas only.
 */

type Message = { id: string; address: string; text: string; ts: number };

export async function GET(req: Request) {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { ok: false, error: "chat backend not configured", messages: [] },
      { status: 503 },
    );
  }

  const since = Number(new URL(req.url).searchParams.get("since") ?? 0);

  // lrange 0 99 — newest first since /post LPUSHes; we reverse before
  // returning to give the frontend chronological order.
  const raw = await redis.lrange<string | Message>(CHAT_LIST_KEY, 0, 99);

  const messages: Message[] = [];
  for (const entry of raw) {
    if (!entry) continue;
    try {
      const m: Message =
        typeof entry === "string" ? (JSON.parse(entry) as Message) : (entry as Message);
      if (m && typeof m.ts === "number" && m.ts > since) {
        messages.push(m);
      }
    } catch {
      // skip malformed entry
    }
  }
  messages.reverse(); // chronological

  return NextResponse.json(
    { ok: true, messages },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}

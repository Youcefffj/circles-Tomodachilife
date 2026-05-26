import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  CHAT_LIST_KEY,
  CHAT_MAX_LENGTH,
  getRedis,
} from "@/lib/server/redis";
import { CHAT_COOKIE_NAME, verifySession } from "@/lib/server/session";

export const runtime = "nodejs";

const MAX_TEXT_LEN = 280;
const MIN_INTERVAL_MS = 1500;
const LAST_POST_KEY = (addr: string) => `hatch:chat:last:${addr}`;

// Strip ASCII control chars (0x00-0x1F + 0x7F). Built via RegExp ctor so
// the source file stays free of invisible bytes.
const CTRL = new RegExp("[\\u0000-\\u001F\\u007F]", "g");

export async function POST(req: Request) {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { ok: false, error: "chat backend not configured" },
      { status: 503 },
    );
  }

  const session = verifySession((await cookies()).get(CHAT_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ ok: false, error: "not signed in" }, { status: 401 });
  }

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const raw = body.text ?? "";
  const text = typeof raw === "string" ? raw.replace(CTRL, "").trim() : "";
  if (!text || text.length > MAX_TEXT_LEN) {
    return NextResponse.json(
      { ok: false, error: `message must be 1-${MAX_TEXT_LEN} chars` },
      { status: 400 },
    );
  }

  // Per-user rate limit: 1 message / 1.5 sec.
  const now = Date.now();
  const lastRaw = await redis.get<string>(LAST_POST_KEY(session.address));
  const last = lastRaw ? Number(lastRaw) : 0;
  if (now - last < MIN_INTERVAL_MS) {
    return NextResponse.json({ ok: false, error: "slow down" }, { status: 429 });
  }
  await redis.set(LAST_POST_KEY(session.address), String(now), { ex: 60 });

  const message = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    address: session.address,
    text,
    ts: now,
  };

  await redis.lpush(CHAT_LIST_KEY, JSON.stringify(message));
  await redis.ltrim(CHAT_LIST_KEY, 0, CHAT_MAX_LENGTH - 1);

  return NextResponse.json({ ok: true, message });
}

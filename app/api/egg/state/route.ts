import { NextResponse } from "next/server";

import { getRedis, USERS_SET_KEY } from "@/lib/server/redis";
import { bearerFrom, verifyToken } from "@/lib/server/session";
import { SHIPPED_SPECIES, type Species } from "@/lib/hatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  /api/egg/state            → read the user's saved egg state from Redis
 * PUT  /api/egg/state            → write it
 *
 * Auth: Bearer <token> issued by /api/chat/login. The token contains the
 * user's address — we use it both to find the storage key and to enforce
 * ownership (a token issued for Alice can only read/write Alice's state).
 *
 * Body shape on PUT:
 *   {
 *     state: {
 *       currentSpecies: Species | null,
 *       family: Species[],
 *       xpCheckpoint: number
 *     }
 *   }
 *
 * Redis key:  hatch:egg:<lowercase-address>
 * Stored as JSON with an added updatedAt for ordering.
 * TTL: 1 year (refreshed on every PUT).
 */

const KEY = (addr: string) => `hatch:egg:${addr.toLowerCase()}`;
const ONE_YEAR_S = 60 * 60 * 24 * 365;

type EggStatePayload = {
  currentSpecies: Species | null;
  family: Species[];
  xpCheckpoint: number;
  updatedAt?: number;
};

export async function GET(req: Request) {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { ok: false, error: "egg-state backend not configured" },
      { status: 503 },
    );
  }

  const session = verifyToken(bearerFrom(req));
  if (!session) {
    return NextResponse.json({ ok: false, error: "not signed in" }, { status: 401 });
  }

  const raw = await redis.get(KEY(session.address));
  const state =
    raw == null
      ? null
      : typeof raw === "string"
      ? safeParse(raw)
      : (raw as EggStatePayload);

  return NextResponse.json(
    { ok: true, state },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(req: Request) {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { ok: false, error: "egg-state backend not configured" },
      { status: 503 },
    );
  }

  const session = verifyToken(bearerFrom(req));
  if (!session) {
    return NextResponse.json({ ok: false, error: "not signed in" }, { status: 401 });
  }

  let body: { state?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const candidate = body.state;
  if (!isValidState(candidate)) {
    return NextResponse.json({ ok: false, error: "invalid state shape" }, { status: 400 });
  }

  const payload: EggStatePayload = {
    currentSpecies: candidate.currentSpecies,
    family: candidate.family,
    xpCheckpoint: candidate.xpCheckpoint,
    updatedAt: Date.now(),
  };

  await redis.set(KEY(session.address), JSON.stringify(payload), {
    ex: ONE_YEAR_S,
  });
  // Keep the global directory in sync so the leaderboard picks up
  // anyone who has ever saved state.
  try {
    await redis.sadd(USERS_SET_KEY, session.address);
  } catch {
    // ignore
  }

  return NextResponse.json({ ok: true, state: payload });
}

function isValidState(v: unknown): v is EggStatePayload {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const species = o.currentSpecies;
  const family = o.family;
  const checkpoint = o.xpCheckpoint;

  const speciesOk =
    species === null ||
    (typeof species === "string" && (SHIPPED_SPECIES as readonly string[]).includes(species));

  const familyOk =
    Array.isArray(family) &&
    family.every(
      (s) =>
        typeof s === "string" && (SHIPPED_SPECIES as readonly string[]).includes(s),
    );

  const checkpointOk = typeof checkpoint === "number" && checkpoint >= 0 && checkpoint < 1e12;

  return speciesOk && familyOk && checkpointOk;
}

function safeParse(s: string): EggStatePayload | null {
  try {
    const parsed = JSON.parse(s);
    return isValidState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

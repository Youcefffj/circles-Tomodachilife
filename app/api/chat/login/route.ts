import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isAddress, type Address, type Hex } from "viem";

import { verifySafeSignature } from "@/lib/server/safe-verify";
import { signSession, CHAT_COOKIE_NAME } from "@/lib/server/session";

export const runtime = "nodejs"; // needs node:crypto for HMAC

/**
 * Issue a chat session cookie.
 *
 * The client signs   "Hatch chat sign-in\nAddress: 0x…\nNonce: <random>"
 * via miniapp-sdk.signMessage (defaults to erc1271 hashing — host wraps
 * with EIP-191 before EIP-712 signing through the user's Safe).
 *
 * We re-hash with EIP-191 server-side and call Safe.isValidSignature.
 * On success, a 24h HMAC-signed cookie is set; later /post requests
 * read the cookie to attribute messages.
 *
 * A small (200ms) artificial delay on failures throttles brute-force
 * sig guessing.
 */

const SLOW_FAIL_MS = 220;
const MAX_NONCE_AGE_MS = 5 * 60 * 1000; // 5 minutes — replay window

export async function POST(req: Request) {
  let body: { address?: string; nonce?: string; signature?: string; timestamp?: number };
  try {
    body = await req.json();
  } catch {
    return badRequest("invalid JSON");
  }

  const { address, nonce, signature, timestamp } = body;
  if (
    !address ||
    !isAddress(address) ||
    !nonce ||
    typeof nonce !== "string" ||
    nonce.length < 8 ||
    !signature ||
    !/^0x[0-9a-fA-F]+$/.test(signature) ||
    !timestamp ||
    typeof timestamp !== "number"
  ) {
    return badRequest("missing or malformed fields");
  }

  // Reject stale signatures (replay protection).
  const now = Date.now();
  if (Math.abs(now - timestamp) > MAX_NONCE_AGE_MS) {
    return badRequest("signature too old");
  }

  const message = chatLoginMessage(address, nonce, timestamp);
  const valid = await verifySafeSignature({
    safeAddress: address as Address,
    message,
    signature: signature as Hex,
  });

  if (!valid) {
    await sleep(SLOW_FAIL_MS);
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }

  const { cookie } = signSession(address);
  const store = await cookies();
  store.set({
    name: CHAT_COOKIE_NAME,
    value: cookie.value,
    maxAge: cookie.maxAge,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return NextResponse.json({ ok: true, address: address.toLowerCase() });
}

export function chatLoginMessage(
  address: string,
  nonce: string,
  timestamp: number,
): string {
  return [
    "Hatch chat sign-in",
    `Address: ${address.toLowerCase()}`,
    `Nonce: ${nonce}`,
    `Timestamp: ${timestamp}`,
    "Issued by hatchlife.vercel.app for chat access.",
  ].join("\n");
}

function badRequest(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

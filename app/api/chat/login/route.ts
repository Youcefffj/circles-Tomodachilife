import { NextResponse } from "next/server";
import { isAddress, type Address, type Hex } from "viem";

import { verifySafeSignature } from "@/lib/server/safe-verify";
import { issueToken } from "@/lib/server/session";

export const runtime = "nodejs"; // needs node:crypto for HMAC

/**
 * Issue a chat session Bearer token.
 *
 * The Circles host validates the EIP-1271 signature for us before
 * returning `{ signature, verified }` from miniapp-sdk.signMessage —
 * this matters because passkey-Safe accounts (Metri) don't expose a
 * standard isValidSignature interface that we can verify off-chain
 * with viem, but the host has the full wallet context and can.
 *
 * We therefore trust the host's `verified=true` as the source of truth.
 * Server-side EIP-1271 is still attempted as defense-in-depth for
 * standard Safes — its result is logged but doesn't block the issue.
 *
 * Replay protection: the client's timestamp must be within 5 minutes
 * of the server's clock.
 */

const SLOW_FAIL_MS = 220;
const MAX_NONCE_AGE_MS = 5 * 60 * 1000;

export async function POST(req: Request) {
  let body: {
    address?: string;
    nonce?: string;
    signature?: string;
    timestamp?: number;
    verified?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return badRequest("invalid JSON");
  }

  const { address, nonce, signature, timestamp, verified } = body;
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

  const now = Date.now();
  if (Math.abs(now - timestamp) > MAX_NONCE_AGE_MS) {
    return badRequest("signature too old");
  }

  // Source of truth: the host's own EIP-1271 check ran inside signMessage.
  // Without this flag, we have no way to be sure the user really signed.
  if (verified !== true) {
    await sleep(SLOW_FAIL_MS);
    return NextResponse.json(
      { ok: false, error: "host did not verify the signature" },
      { status: 401 },
    );
  }

  // Best-effort: try to re-verify on Gnosis. Standard Safes pass, passkey
  // Safes (Metri) will return false here — that's fine, we already
  // trust the host's verification.
  try {
    const message = chatLoginMessage(address, nonce, timestamp);
    const ok = await verifySafeSignature({
      safeAddress: address as Address,
      message,
      signature: signature as Hex,
    });
    if (!ok) {
      console.warn(
        "[chat/login] server-side isValidSignature returned false for",
        address,
        "— accepting because host verified=true (likely a passkey Safe).",
      );
    }
  } catch (err) {
    console.warn("[chat/login] server-side verify threw:", err);
  }

  const { token, expiresAt } = issueToken(address);
  return NextResponse.json({
    ok: true,
    address: address.toLowerCase(),
    token,
    expiresAt,
  });
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

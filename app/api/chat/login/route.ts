import { NextResponse } from "next/server";
import { isAddress, type Address, type Hex } from "viem";

import { verifySafeSignature } from "@/lib/server/safe-verify";
import { issueToken } from "@/lib/server/session";

export const runtime = "nodejs"; // needs node:crypto for HMAC

/**
 * Issue a chat session Bearer token.
 *
 * Client signs   "Hatch chat sign-in\nAddress: 0x…\nNonce: <random>"
 * through miniapp-sdk.signMessage (defaults to EIP-191 + Safe EIP-712).
 * We rehash with EIP-191 and call Safe.isValidSignature on Gnosis.
 * On success, return an HMAC-signed token in the body — client stores
 * it in localStorage and sends it as `Authorization: Bearer <token>`
 * on subsequent posts. Bearer (vs cookie) survives third-party-cookie
 * blocking inside the Circles playground iframe.
 */

const SLOW_FAIL_MS = 220;
const MAX_NONCE_AGE_MS = 5 * 60 * 1000;

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

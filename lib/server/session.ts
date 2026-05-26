import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stateless HMAC-signed session cookie for the chat. Stores the user's
 * Circles address + expiry. The signature is required so a forged cookie
 * can't impersonate someone else's wallet.
 *
 * Cookie format:   <base64url(payload)>.<base64url(hmac)>
 *   payload = JSON { address, exp }     (exp = unix seconds)
 *
 * NB: an HMAC-signed cookie is fine here because the worst case of a
 * leaked cookie is "someone posts chat messages as me until exp". No
 * funds, no on-chain authority is bound to it.
 */

const COOKIE_NAME = "hatch_chat_session";
const COOKIE_LIFETIME_S = 60 * 60 * 24; // 24h

type Payload = { address: string; exp: number };

function secret(): Buffer {
  const s = process.env.HATCH_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("HATCH_SESSION_SECRET env var missing or too short (need 32+ chars).");
  }
  return Buffer.from(s, "utf8");
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function signSession(address: string): {
  cookie: { name: string; value: string; maxAge: number };
  payload: Payload;
} {
  const payload: Payload = {
    address: address.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + COOKIE_LIFETIME_S,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const mac = b64url(createHmac("sha256", secret()).update(body).digest());
  return {
    cookie: {
      name: COOKIE_NAME,
      value: `${body}.${mac}`,
      maxAge: COOKIE_LIFETIME_S,
    },
    payload,
  };
}

export function verifySession(cookieValue: string | undefined): Payload | null {
  if (!cookieValue) return null;
  const dot = cookieValue.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = cookieValue.slice(0, dot);
  const mac = cookieValue.slice(dot + 1);

  let expected: Buffer;
  try {
    expected = createHmac("sha256", secret()).update(body).digest();
  } catch {
    return null;
  }
  const given = b64urlDecode(mac);
  if (given.length !== expected.length) return null;
  if (!timingSafeEqual(given, expected)) return null;

  let payload: Payload;
  try {
    payload = JSON.parse(b64urlDecode(body).toString("utf8")) as Payload;
  } catch {
    return null;
  }
  if (!payload.address || typeof payload.exp !== "number") return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export const CHAT_COOKIE_NAME = COOKIE_NAME;

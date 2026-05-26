import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stateless HMAC-signed session token. Stores the user's Circles
 * address + expiry. Used as a Bearer token in the Authorization header
 * (not a cookie) so it survives third-party-cookie blocking inside the
 * Circles playground iframe — works identically across Safari iOS,
 * Chrome, Firefox, etc.
 *
 * Token format:   <base64url(payload)>.<base64url(hmac)>
 *   payload = JSON { address, exp }   (exp = unix seconds)
 *
 * Signing the payload (not just storing it) is what prevents a forged
 * token from impersonating someone else's wallet.
 */

const TOKEN_LIFETIME_S = 60 * 60 * 24; // 24h

type Payload = { address: string; exp: number };

function secret(): Buffer {
  const s = process.env.HATCH_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "HATCH_SESSION_SECRET env var missing or too short (need 32+ chars).",
    );
  }
  return Buffer.from(s, "utf8");
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function issueToken(address: string): { token: string; expiresAt: number } {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_LIFETIME_S;
  const payload: Payload = { address: address.toLowerCase(), exp };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const mac = b64url(createHmac("sha256", secret()).update(body).digest());
  return { token: `${body}.${mac}`, expiresAt: exp };
}

export function verifyToken(token: string | undefined): Payload | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1);

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

/** Extract a Bearer token from the Authorization header. */
export function bearerFrom(req: Request): string | undefined {
  const auth = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!auth) return undefined;
  const [scheme, value] = auth.split(" ", 2);
  if (scheme?.toLowerCase() !== "bearer" || !value) return undefined;
  return value.trim();
}

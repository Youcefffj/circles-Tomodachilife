"use client";

/**
 * Shared accessors for the Bearer token issued by /api/chat/login.
 * Both the chat polling and the egg-state sync hook read from the same
 * key — one sign-in unlocks cross-device persistence for both features.
 */

const LS_TOKEN_KEY = "hatch_chat_token";
const LS_EXP_KEY = "hatch_chat_token_exp";

export function readSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(LS_TOKEN_KEY);
  const exp = Number(window.localStorage.getItem(LS_EXP_KEY) ?? 0);
  if (!token || !exp) return null;
  if (exp * 1000 < Date.now()) {
    window.localStorage.removeItem(LS_TOKEN_KEY);
    window.localStorage.removeItem(LS_EXP_KEY);
    return null;
  }
  return token;
}

export function writeSessionToken(token: string, expiresAt: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_TOKEN_KEY, token);
  window.localStorage.setItem(LS_EXP_KEY, String(expiresAt));
}

export function clearSessionToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LS_TOKEN_KEY);
  window.localStorage.removeItem(LS_EXP_KEY);
}

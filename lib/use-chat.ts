"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useWallet } from "@/components/wallet/WalletProvider";

export type ChatMessage = {
  id: string;
  address: string;
  text: string;
  ts: number;
};

type Status = "loggedOut" | "signing" | "loggedIn" | "error";

const LS_KEY = "hatch_chat_session_marker";
const POLL_INTERVAL_MS = 3000;

/**
 * Chat client hook — owns the sign-in flow + the polling loop.
 *
 * Sign-in:
 *   1. Generate a nonce + timestamp client-side
 *   2. signMessage("Hatch chat sign-in\n…")  via miniapp-sdk (Safe signs)
 *   3. POST /api/chat/login — server verifies via EIP-1271 isValidSignature
 *      on the Safe and sets an HMAC-signed httpOnly cookie
 *   4. We persist a localStorage marker so the UI knows to show the input
 *      next time (the cookie itself is httpOnly).
 *
 * Polling:
 *   GET /api/chat/messages?since=<lastTs>  every 3s while the page is open.
 */
export function useChat() {
  const { address } = useWallet();
  const [status, setStatus] = useState<Status>("loggedOut");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sinceRef = useRef(0);

  // Restore "logged in" flag from localStorage on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(LS_KEY)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("loggedIn");
    }
  }, []);

  // Poll messages whenever we have a wallet (whether signed in or not —
  // reading is public).
  useEffect(() => {
    let cancelled = false;

    const pull = async () => {
      try {
        const res = await fetch(`/api/chat/messages?since=${sinceRef.current}`);
        if (!res.ok) return;
        const data = (await res.json()) as { messages?: ChatMessage[] };
        if (cancelled || !data.messages || data.messages.length === 0) return;
        setMessages((prev) => {
          const merged = [...prev, ...data.messages!];
          // dedupe by id, sorted
          const byId = new Map(merged.map((m) => [m.id, m]));
          const out = Array.from(byId.values()).sort((a, b) => a.ts - b.ts);
          sinceRef.current = out.length > 0 ? out[out.length - 1].ts : 0;
          return out.slice(-150); // cap memory
        });
      } catch {
        // network blip — try again next tick
      }
    };

    // initial load grabs everything
    sinceRef.current = 0;
    pull();
    const iv = setInterval(pull, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, []);

  const login = useCallback(async () => {
    if (!address) return;
    setStatus("signing");
    setError(null);
    try {
      const { signMessage } = await import("@aboutcircles/miniapp-sdk");
      const timestamp = Date.now();
      const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const text = [
        "Hatch chat sign-in",
        `Address: ${address.toLowerCase()}`,
        `Nonce: ${nonce}`,
        `Timestamp: ${timestamp}`,
        "Issued by hatchlife.vercel.app for chat access.",
      ].join("\n");

      const { signature } = await signMessage(text);

      const res = await fetch("/api/chat/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, nonce, timestamp, signature }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? "login failed");

      if (typeof window !== "undefined") {
        window.localStorage.setItem(LS_KEY, "1");
      }
      setStatus("loggedIn");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
      setTimeout(() => setStatus("loggedOut"), 2400);
    }
  }, [address]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    try {
      const res = await fetch("/api/chat/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (res.status === 401) {
        // Cookie expired — reset session.
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(LS_KEY);
        }
        setStatus("loggedOut");
        return false;
      }
      const data = (await res.json()) as { ok: boolean; message?: ChatMessage; error?: string };
      if (!data.ok) {
        setError(data.error ?? "send failed");
        return false;
      }
      // Optimistic append; the next poll will reconcile by id.
      if (data.message) {
        setMessages((prev) => [...prev, data.message!].slice(-150));
        sinceRef.current = data.message.ts;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    }
  }, []);

  return { status, messages, error, login, send };
}

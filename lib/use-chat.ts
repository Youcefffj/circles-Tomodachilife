"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  clearSessionToken,
  readSessionToken,
  writeSessionToken,
} from "@/lib/auth-token";
import { useWallet } from "@/components/wallet/WalletProvider";

export type ChatMessage = {
  id: string;
  address: string;
  text: string;
  ts: number;
};

type Status = "loggedOut" | "signing" | "loggedIn" | "error";

export type ChatDebug = {
  lastPollAt: number | null;
  lastPollStatus: string;
  lastPollCount: number;
  lastSendStatus: string;
  totalMessages: number;
  hasToken: boolean;
};

const POLL_INTERVAL_MS = 3000;

/**
 * Chat client hook — owns the sign-in flow + the polling loop.
 *
 * After a successful sign-in we also dispatch a `hatch:signed-in` event
 * on `window`. The egg-state hook listens for this and pushes the
 * current local state to the server as the initial cross-device backup.
 */
export function useChat() {
  const { address } = useWallet();
  const [status, setStatus] = useState<Status>("loggedOut");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<ChatDebug>({
    lastPollAt: null,
    lastPollStatus: "—",
    lastPollCount: 0,
    lastSendStatus: "—",
    totalMessages: 0,
    hasToken: false,
  });
  const sinceRef = useRef(0);
  const pullRef = useRef<() => Promise<void>>(async () => {});

  // Restore session token from localStorage on mount.
  useEffect(() => {
    const token = readSessionToken();
    if (token) {
      setStatus("loggedIn");
      setDebug((d) => ({ ...d, hasToken: true }));
    }
  }, []);

  // Polling loop — pulls every 3s, latest first.
  useEffect(() => {
    let cancelled = false;

    const pull = async () => {
      try {
        const res = await fetch(`/api/chat/messages?since=${sinceRef.current}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as {
          ok?: boolean;
          messages?: ChatMessage[];
          error?: string;
        };
        if (cancelled) return;

        setDebug((d) => ({
          ...d,
          lastPollAt: Date.now(),
          lastPollStatus: res.ok ? `${res.status} ok` : `${res.status} ${data.error ?? ""}`,
          lastPollCount: data.messages?.length ?? 0,
        }));

        if (!res.ok || !data.messages || data.messages.length === 0) return;

        setMessages((prev) => {
          const merged = [...prev, ...data.messages!];
          const byId = new Map(merged.map((m) => [m.id, m]));
          const out = Array.from(byId.values()).sort((a, b) => a.ts - b.ts);
          sinceRef.current = out.length > 0 ? out[out.length - 1].ts : 0;
          setDebug((d) => ({ ...d, totalMessages: out.length }));
          return out.slice(-150);
        });
      } catch (err) {
        if (cancelled) return;
        console.error("[useChat] pull failed:", err);
        setDebug((d) => ({
          ...d,
          lastPollAt: Date.now(),
          lastPollStatus: `throw: ${err instanceof Error ? err.message : String(err)}`,
        }));
      }
    };

    pullRef.current = pull;
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

      const { signature, verified } = await signMessage(text);

      const res = await fetch("/api/chat/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, nonce, timestamp, signature, verified }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        token?: string;
        expiresAt?: number;
        error?: string;
      };
      if (!data.ok || !data.token || !data.expiresAt) {
        throw new Error(data.error ?? `login http ${res.status}`);
      }

      writeSessionToken(data.token, data.expiresAt);
      setStatus("loggedIn");
      setDebug((d) => ({ ...d, hasToken: true }));

      // Notify other hooks (egg-state sync, etc.) that auth just landed.
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("hatch:signed-in"));
      }
    } catch (err) {
      console.error("[useChat] login failed:", err);
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
      setTimeout(() => setStatus("loggedOut"), 2400);
    }
  }, [address]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return false;

    const token = readSessionToken();
    if (!token) {
      setStatus("loggedOut");
      setDebug((d) => ({ ...d, hasToken: false, lastSendStatus: "no token" }));
      return false;
    }

    setDebug((d) => ({ ...d, lastSendStatus: "sending…" }));
    try {
      const res = await fetch("/api/chat/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: trimmed }),
      });

      let data: { ok?: boolean; message?: ChatMessage; error?: string } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        // body wasn't JSON
      }

      console.log("[useChat] POST /post", res.status, data);

      setDebug((d) => ({
        ...d,
        lastSendStatus: res.ok
          ? `${res.status} ok id=${data.message?.id ?? "—"}`
          : `${res.status} ${data.error ?? ""}`,
      }));

      if (res.status === 401) {
        clearSessionToken();
        setStatus("loggedOut");
        setDebug((d) => ({ ...d, hasToken: false }));
        setError("session expired — sign in again");
        return false;
      }
      if (!res.ok || !data.ok) {
        setError(data.error ?? `send failed (http ${res.status})`);
        return false;
      }

      sinceRef.current = 0;
      await pullRef.current();
      return true;
    } catch (err) {
      console.error("[useChat] send failed:", err);
      setError(err instanceof Error ? err.message : String(err));
      setDebug((d) => ({ ...d, lastSendStatus: "throw" }));
      return false;
    }
  }, []);

  return { status, messages, error, login, send, debug };
}

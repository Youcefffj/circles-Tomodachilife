"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { PixelButton } from "@/components/hatch/PixelButton";
import { useChat, type ChatMessage } from "@/lib/use-chat";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useSdk } from "@/components/wallet/SdkProvider";
import {
  SPECIES,
  nameFromSeed,
  speciesFromAddress,
} from "@/lib/hatch";
import { cn, shortenAddress } from "@/lib/utils";

export default function ChatPage() {
  const wallet = useWallet();
  const sdk = useSdk();
  const { status, messages, error, login, send, debug } = useChat();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [isDebug, setIsDebug] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDebug(sp.get("debug") === "1");
  }, []);

  // Auto-scroll to bottom whenever a new message lands.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);
    const ok = await send(draft);
    if (ok) setDraft("");
    setSending(false);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-3xl flex-col gap-4 pb-6">
      {/* ── Title ─────────────────────────────────────────────── */}
      <div className="px-1">
        <p className="font-pixel text-[10px] uppercase tracking-[0.25em] text-[var(--species-accent)]">
          The Lounge
        </p>
        <h1 className="font-pixel mt-1 text-2xl text-foreground sm:text-3xl">
          Everyone&apos;s here.
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          One global chat. Ask for feeds, brag about evolutions, find your
          next trustée.
        </p>
      </div>

      {/* ── Message list ─────────────────────────────────────── */}
      <ol
        ref={listRef}
        className="cartridge flex-1 overflow-y-auto p-4"
        style={{ minHeight: 240 }}
      >
        {messages.length === 0 && (
          <li className="grid h-full place-items-center text-center">
            <div>
              <p aria-hidden className="text-3xl">💬</p>
              <p className="font-pixel mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                Nobody has said hi yet.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Be the first.
              </p>
            </div>
          </li>
        )}

        {messages.map((m) => (
          <ChatBubble
            key={m.id}
            msg={m}
            mine={!!wallet.address && m.address.toLowerCase() === wallet.address.toLowerCase()}
          />
        ))}
      </ol>

      {/* ── Composer ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        {!wallet.address && (
          <CartridgeMsg
            icon="🛰"
            label="Open inside Circles to join the chat"
          />
        )}

        {wallet.address && sdk.kind === "ready" && !sdk.hasAvatar && (
          <CartridgeMsg
            icon="🐣"
            label="Need a Circles avatar to post — sign up at metri.xyz"
          />
        )}

        {wallet.address && status === "loggedOut" && sdk.kind === "ready" && sdk.hasAvatar && (
          <div className="cartridge flex flex-col items-center gap-3 p-5 text-center">
            <p className="font-pixel text-[10px] uppercase tracking-wider text-muted-foreground">
              Sign once to join the chat
            </p>
            <p className="text-xs text-muted-foreground">
              One signature, 24h session. No CRC moves, just proves you own
              this wallet.
            </p>
            <PixelButton
              size="lg"
              variant="primary"
              icon="✍️"
              onClick={login}
              className="w-full sm:w-auto"
            >
              Sign in to chat
            </PixelButton>
          </div>
        )}

        {status === "signing" && (
          <CartridgeMsg icon="✍️" label="Waiting for your signature…" />
        )}

        {status === "error" && error && (
          <div className="cartridge-sm p-3">
            <p className="font-pixel text-[10px] uppercase tracking-wider text-destructive">
              Sign-in failed: {truncate(error, 100)}
            </p>
          </div>
        )}

        {isDebug && (
          <div className="cartridge-sm grid grid-cols-2 gap-x-3 gap-y-1 p-3 font-mono text-[10px]">
            <span className="text-muted-foreground">wallet</span>
            <span className="text-foreground break-all">{wallet.address ?? "—"}</span>
            <span className="text-muted-foreground">sdk</span>
            <span className="text-foreground">{sdk.kind}{sdk.kind === "ready" ? ` · avatar=${sdk.hasAvatar}` : ""}</span>
            <span className="text-muted-foreground">chat status</span>
            <span className="text-foreground">{status}</span>
            <span className="text-muted-foreground">last poll</span>
            <span className="text-foreground">
              {debug.lastPollAt ? new Date(debug.lastPollAt).toLocaleTimeString() : "—"} · {debug.lastPollStatus}
            </span>
            <span className="text-muted-foreground">last poll count</span>
            <span className="text-foreground">{debug.lastPollCount}</span>
            <span className="text-muted-foreground">last send</span>
            <span className="text-foreground">{debug.lastSendStatus}</span>
            <span className="text-muted-foreground">total in state</span>
            <span className="text-foreground">{messages.length}</span>
          </div>
        )}

        {status === "loggedIn" && (
          <form onSubmit={onSubmit} className="cartridge-sm flex items-center gap-2 p-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={280}
              placeholder="Say something…"
              className={cn(
                "font-pixel min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-foreground",
                "placeholder:text-muted-foreground focus:outline-none",
              )}
            />
            <span className="font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">
              {draft.length}/280
            </span>
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              className={cn(
                "btn-pixel font-pixel rounded-md bg-[var(--species-accent)] px-4 py-2 text-[11px] uppercase tracking-wider text-[var(--cream)]",
                "disabled:opacity-50",
              )}
            >
              {sending ? "…" : "Send"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */

function ChatBubble({ msg, mine }: { msg: ChatMessage; mine: boolean }) {
  const species = speciesFromAddress(msg.address);
  const meta = SPECIES[species];
  const name = capitalize(nameFromSeed(msg.address));

  return (
    <li
      className={cn(
        "mb-3 flex flex-col gap-1",
        mine ? "items-end" : "items-start",
      )}
    >
      <div className="flex items-center gap-2 px-1">
        <span aria-hidden className="text-sm">{meta.icon}</span>
        <span className="font-pixel text-[10px] uppercase tracking-wider text-foreground">
          {name}
        </span>
        <span className="font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">
          {shortenAddress(msg.address)} · {timeAgo(msg.ts)}
        </span>
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-lg border-2 border-[var(--border)] px-3 py-2 text-sm",
          mine
            ? "bg-[var(--species-accent)] text-[var(--cream)]"
            : "bg-[oklch(0.21_0.05_var(--world-hue,245))] text-foreground",
        )}
        style={{
          background: mine
            ? "var(--species-accent)"
            : "oklch(0.21 0.05 var(--world-hue))",
        }}
      >
        {msg.text}
      </div>
    </li>
  );
}

function CartridgeMsg({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="cartridge-sm flex items-center gap-3 p-3">
      <span aria-hidden className="text-xl">{icon}</span>
      <p className="font-pixel text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

function timeAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

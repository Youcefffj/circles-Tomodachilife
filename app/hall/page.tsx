"use client";

import { useFeedEvents, type FeedEvent } from "@/lib/use-feed-events";
import { cn, shortenAddress } from "@/lib/utils";

export default function HallPage() {
  const { events, loading, error } = useFeedEvents(40);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-12">
      {/* ── Title ────────────────────────────────────────────── */}
      <div className="px-1">
        <p className="font-pixel text-[10px] uppercase tracking-[0.25em] text-[var(--species-accent)]">
          The Hall
        </p>
        <h1 className="font-pixel mt-1 text-2xl text-foreground sm:text-3xl">
          What&apos;s happening in your circle.
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Every CRC that lands in or leaves your wallet feeds (or fattens) a
          blob somewhere. Latest moves first.
        </p>
      </div>

      {/* ── Empty / loading / error ──────────────────────────── */}
      {loading && events.length === 0 && (
        <div className="cartridge grid min-h-32 place-items-center p-8">
          <p className="font-pixel text-[10px] uppercase tracking-wider text-muted-foreground">
            Loading the feed…
          </p>
        </div>
      )}

      {error && (
        <div className="cartridge p-5">
          <p className="font-pixel text-[10px] uppercase tracking-wider text-destructive">
            Couldn&apos;t load history
          </p>
          <p className="mt-2 break-all text-xs text-muted-foreground">{error}</p>
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="cartridge grid min-h-48 place-items-center p-8">
          <div className="text-center">
            <p aria-hidden className="text-4xl">🌊</p>
            <p className="font-pixel mt-4 text-[10px] uppercase tracking-wider text-muted-foreground">
              Nothing in the hall yet.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Feed your blob or tip a friend — the first move shows up here.
            </p>
          </div>
        </div>
      )}

      {/* ── Event list ───────────────────────────────────────── */}
      {events.length > 0 && (
        <ul className="flex flex-col gap-2">
          {events.map((e) => (
            <EventRow key={`${e.txHash}-${e.timestamp}-${e.kind}`} event={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

function EventRow({ event }: { event: FeedEvent }) {
  const isIn = event.kind === "in";
  const verb = isIn ? "fed your blob" : "you fed";
  const icon = isIn ? "🍼" : "💸";

  return (
    <li
      className={cn(
        "cartridge-sm flex items-center gap-3 px-3 py-2.5",
      )}
    >
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-2 border-[var(--border)] text-base"
        style={{ background: "oklch(0.13 0.04 var(--world-hue))" }}
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-pixel truncate text-[11px] text-foreground">
          {isIn ? (
            <>
              <span className="text-[var(--species-accent)]">
                {shortenAddress(event.counterparty)}
              </span>{" "}
              <span className="text-muted-foreground">{verb}</span>
            </>
          ) : (
            <>
              <span className="text-muted-foreground">{verb}</span>{" "}
              <span className="text-[var(--species-accent)]">
                {shortenAddress(event.counterparty)}
              </span>
            </>
          )}
        </span>
        <span className="font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">
          {formatRelative(event.timestamp)}
        </span>
      </div>
      <span className="font-pixel text-xs text-foreground">
        {isIn ? "+" : "−"}
        {fmtCrc(event.crc)} <span className="text-muted-foreground">CRC</span>
      </span>
    </li>
  );
}

function fmtCrc(n: number): string {
  if (n >= 1000) return n.toFixed(0);
  if (n >= 10) return n.toFixed(1);
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(3);
}

function formatRelative(ts: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} d ago`;
  return new Date(ts * 1000).toLocaleDateString();
}

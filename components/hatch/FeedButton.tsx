"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useSdk } from "@/components/wallet/SdkProvider";
import { PixelButton } from "@/components/hatch/PixelButton";

type State = "idle" | "minting" | "success" | "error";

type AvatarLike = {
  personalToken: {
    mint: () => Promise<unknown>;
    getMintableAmount?: () => Promise<{ amount?: bigint }>;
  };
};

/** Min CRC the protocol must have accrued before the button is enabled. */
const MIN_CLAIMABLE_CRC = 0.05;
/** Daily cap on self-feeds. Past this, we redirect the user to the leaderboard. */
const DAILY_SELF_FEED_LIMIT = 2;
const POLL_INTERVAL_MS = 30_000;

/* ── Local daily counter helpers ─────────────────────────────── */

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type DailyCounter = { date: string; count: number };

function readCounter(address: string): DailyCounter {
  const fallback: DailyCounter = { date: todayIso(), count: 0 };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(
      `hatch_self_feeds_${address.toLowerCase()}`,
    );
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as DailyCounter;
    if (parsed.date !== fallback.date) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function writeCounter(address: string, value: DailyCounter) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    `hatch_self_feeds_${address.toLowerCase()}`,
    JSON.stringify(value),
  );
}

/**
 * Daily-mint button with two gates:
 *   1. Protocol gate     — at least MIN_CLAIMABLE_CRC accrued (otherwise
 *                          spam-clicks would each mint a few thousandths
 *                          and confuse the user)
 *   2. Social gate       — at most DAILY_SELF_FEED_LIMIT self-feeds per
 *                          day per wallet. Past that, the button is
 *                          replaced by a "go feed someone else" CTA that
 *                          pushes the user to /leaderboard — the social
 *                          loop ("regarde les autres") that the spec
 *                          calls for.
 */
export function FeedButton({
  onSuccess,
  squish,
  className,
}: {
  onSuccess: () => void;
  squish: () => void;
  className?: string;
}) {
  const sdk = useSdk();
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mintable, setMintable] = useState<number | null>(null);
  const [counter, setCounter] = useState<DailyCounter>({
    date: todayIso(),
    count: 0,
  });

  // Load the daily counter when the wallet is known.
  useEffect(() => {
    if (sdk.kind === "ready" && sdk.address) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCounter(readCounter(sdk.address));
    }
  }, [sdk]);

  const refreshMintable = useCallback(async () => {
    if (sdk.kind !== "ready" || !sdk.avatar) return;
    const avatar = sdk.avatar as AvatarLike;
    if (!avatar.personalToken.getMintableAmount) return;
    try {
      const result = await avatar.personalToken.getMintableAmount();
      const atto = result.amount ?? BigInt(0);
      setMintable(Number(atto) / 1e18);
    } catch (err) {
      console.warn("[FeedButton] getMintableAmount failed:", err);
    }
  }, [sdk]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshMintable();
    const iv = setInterval(refreshMintable, POLL_INTERVAL_MS);
    return () => clearInterval(iv);
  }, [refreshMintable]);

  const capped = counter.count >= DAILY_SELF_FEED_LIMIT;
  const hasClaimable = (mintable ?? 0) >= MIN_CLAIMABLE_CRC;

  const handleFeed = async () => {
    if (sdk.kind !== "ready" || !sdk.hasAvatar || !sdk.avatar) return;
    if (capped || !hasClaimable) return;

    setState("minting");
    setErrorMsg(null);
    squish();

    try {
      const avatar = sdk.avatar as AvatarLike;
      await avatar.personalToken.mint();

      // Bump the daily counter.
      const next: DailyCounter = {
        date: todayIso(),
        count: counter.count + 1,
      };
      writeCounter(sdk.address, next);
      setCounter(next);

      setState("success");
      onSuccess();
      setTimeout(() => {
        refreshMintable();
        setState("idle");
      }, 2200);
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setTimeout(() => setState("idle"), 3500);
    }
  };

  // ── Render: post-cap CTA replaces the button entirely. ────────
  if (capped) {
    return (
      <div className={className}>
        <Link
          href="/leaderboard"
          className="btn-pixel font-pixel flex w-full items-center justify-center gap-2 rounded-md bg-[var(--gold)] px-6 py-3.5 text-xs uppercase tracking-wider text-[oklch(0.16_0.045_245)] hover:bg-[oklch(0.85_0.15_78)]"
        >
          <span aria-hidden className="text-lg leading-none">🏆</span>
          <span>Go feed someone else →</span>
        </Link>
        <p className="font-pixel mt-2 text-center text-[9px] uppercase tracking-wider text-muted-foreground">
          You&apos;ve fed your own blob {counter.count}/{DAILY_SELF_FEED_LIMIT} times today
          — check the leaderboard.
        </p>
      </div>
    );
  }

  const label =
    state === "minting"
      ? "Minting…"
      : state === "success"
      ? `✓ Claimed ${mintable && mintable > 0 ? `${mintable.toFixed(2)} CRC` : ""}`
      : state === "error"
      ? "✗ Try again"
      : mintable === null
      ? "Checking…"
      : hasClaimable
      ? `Feed · Claim ${mintable.toFixed(2)} CRC`
      : "Already fed for now";

  const enabled =
    sdk.kind === "ready" &&
    sdk.hasAvatar &&
    state !== "minting" &&
    hasClaimable &&
    !capped;

  return (
    <div className={className}>
      <PixelButton
        size="lg"
        variant="primary"
        icon="🍼"
        onClick={handleFeed}
        disabled={!enabled}
        className="w-full"
      >
        {label}
      </PixelButton>
      {state === "error" && errorMsg && (
        <p className="font-pixel mt-2 text-center text-[9px] uppercase tracking-wider text-destructive">
          {truncate(errorMsg, 80)}
        </p>
      )}
      {state === "idle" && !hasClaimable && mintable !== null && (
        <p className="font-pixel mt-2 text-center text-[9px] uppercase tracking-wider text-muted-foreground">
          Personal CRC accrues at ~1/hour — come back later
        </p>
      )}
      {state === "idle" && hasClaimable && (
        <p className="font-pixel mt-2 text-center text-[9px] uppercase tracking-wider text-muted-foreground">
          Self-feeds today: {counter.count}/{DAILY_SELF_FEED_LIMIT}
        </p>
      )}
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

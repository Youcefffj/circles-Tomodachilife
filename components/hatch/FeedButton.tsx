"use client";

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

/** Below this CRC value we treat the claim as "nothing meaningful to mint". */
const MIN_CLAIMABLE_CRC = 0.05;
const POLL_INTERVAL_MS = 30_000;

/**
 * Triggers the user's daily Circles mint, but only when there's a
 * meaningful amount actually accrued. Circles V2 mints continuously
 * (~1 CRC/hour), so naive spam-clicks would each claim a few thousandths
 * of a CRC — visually invisible and confusing. The button polls
 * personalToken.getMintableAmount() and gates on it.
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
    // Fire-and-forget: refreshMintable awaits its own state set inside,
    // so this isn't a synchronous setState from the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshMintable();
    const iv = setInterval(refreshMintable, POLL_INTERVAL_MS);
    return () => clearInterval(iv);
  }, [refreshMintable]);

  const hasClaimable = (mintable ?? 0) >= MIN_CLAIMABLE_CRC;
  const enabled =
    sdk.kind === "ready" && sdk.hasAvatar && state !== "minting" && hasClaimable;

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
      : "Already fed today";

  const handleFeed = async () => {
    if (sdk.kind !== "ready" || !sdk.hasAvatar || !sdk.avatar) return;
    if (!hasClaimable) return;

    setState("minting");
    setErrorMsg(null);
    squish();

    try {
      const avatar = sdk.avatar as AvatarLike;
      await avatar.personalToken.mint();
      setState("success");
      onSuccess();
      // Re-poll mintable so the button flips to "Already fed today".
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
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

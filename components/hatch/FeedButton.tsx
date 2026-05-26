"use client";

import { useState } from "react";

import { useSdk } from "@/components/wallet/SdkProvider";
import { PixelButton } from "@/components/hatch/PixelButton";

type State = "idle" | "minting" | "success" | "error";

type AvatarLike = {
  personalToken: {
    mint: () => Promise<unknown>;
    getMintableAmount?: () => Promise<{ amount?: bigint }>;
  };
};

/**
 * Triggers the user's daily Circles mint. The personal-token issuance
 * accumulates ~24 CRC/day; clicking Feed claims everything pending and
 * the new CRC lands in the user's wallet, which our progress hook then
 * re-reads as XP.
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

  const enabled =
    sdk.kind === "ready" && sdk.hasAvatar && state !== "minting";

  const label =
    state === "minting"
      ? "Minting…"
      : state === "success"
      ? "✓ Fed!"
      : state === "error"
      ? "✗ Try again"
      : "Feed · Claim today";

  const handleFeed = async () => {
    if (sdk.kind !== "ready" || !sdk.hasAvatar || !sdk.avatar) return;

    setState("minting");
    setErrorMsg(null);
    squish(); // optimistic UI feedback

    try {
      const avatar = sdk.avatar as AvatarLike;
      await avatar.personalToken.mint();
      setState("success");
      onSuccess();
      setTimeout(() => setState("idle"), 1800);
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setTimeout(() => setState("idle"), 3200);
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
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

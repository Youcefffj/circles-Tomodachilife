"use client";

import { useEffect, useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PixelButton } from "@/components/hatch/PixelButton";
import { useSdk } from "@/components/wallet/SdkProvider";
import { cn, shortenAddress } from "@/lib/utils";

type TrustRow = {
  subjectAvatar: string;
  objectAvatar: string;
  relation: "trusts" | "trustedBy" | "mutuallyTrusts";
  timestamp: number;
};

type AvatarLike = {
  trust: { getAll: () => Promise<TrustRow[]> };
  transfer: { advanced: (to: string, amount: bigint) => Promise<unknown> };
};

type TipState = Record<string, "idle" | "sending" | "success" | "error">;

/**
 * Visit-a-friend flow: lists the user's outgoing trust graph (people they
 * trust) and lets them send 1 CRC as a "feed visit". The tip moves through
 * the trust network via pathfinding (transfer.advanced), so any Circles-
 * connected recipient can receive it.
 */
export function FriendsDialog({ onTipSent }: { onTipSent: () => void }) {
  const sdk = useSdk();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<TrustRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tipState, setTipState] = useState<TipState>({});

  const enabled = sdk.kind === "ready" && sdk.hasAvatar;

  // Lazy-load trust list when the sheet opens for the first time.
  useEffect(() => {
    if (!open || rows !== null || sdk.kind !== "ready" || !sdk.avatar) return;
    let cancelled = false;
    (async () => {
      try {
        const avatar = sdk.avatar as AvatarLike;
        const all = await avatar.trust.getAll();
        if (cancelled) return;
        // Only people I can send to: I trust them (so any path back exists).
        const outgoing = all.filter(
          (r) => r.relation === "trusts" || r.relation === "mutuallyTrusts",
        );
        setRows(outgoing);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, rows, sdk]);

  const handleTip = async (target: string) => {
    if (sdk.kind !== "ready" || !sdk.avatar) return;
    setTipState((s) => ({ ...s, [target]: "sending" }));
    try {
      const avatar = sdk.avatar as AvatarLike;
      await avatar.transfer.advanced(target, BigInt(1e18)); // 1 CRC
      setTipState((s) => ({ ...s, [target]: "success" }));
      onTipSent();
      setTimeout(
        () => setTipState((s) => ({ ...s, [target]: "idle" })),
        2200,
      );
    } catch (err) {
      console.error("[tip] failed:", err);
      setTipState((s) => ({ ...s, [target]: "error" }));
      setTimeout(
        () => setTipState((s) => ({ ...s, [target]: "idle" })),
        3200,
      );
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <PixelButton
            size="lg"
            variant="outline"
            icon="👥"
            disabled={!enabled}
            className="w-full"
          >
            Visit a friend
          </PixelButton>
        }
      />
      <SheetContent side="right" className="w-[min(420px,90vw)]">
        <SheetHeader>
          <SheetTitle className="font-pixel text-sm uppercase tracking-wider">
            Your trust circle
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-6">
          <p className="text-xs text-muted-foreground">
            Send <span className="font-pixel">1 CRC</span> to a friend. Your blob earns
            XP either way, and theirs grows too.
          </p>

          {loadError && (
            <p className="font-pixel text-[10px] text-destructive">
              Couldn&apos;t load trust list: {loadError}
            </p>
          )}

          {rows === null && !loadError && (
            <p className="font-pixel text-[10px] uppercase tracking-wider text-muted-foreground">
              Loading your trust graph…
            </p>
          )}

          {rows && rows.length === 0 && (
            <div className="cartridge p-4 text-center">
              <p aria-hidden className="text-2xl">🌱</p>
              <p className="font-pixel mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                Nobody in your trust circle yet.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Open the Circles app, trust someone, then come back.
              </p>
            </div>
          )}

          {rows?.map((r) => (
            <FriendRow
              key={r.objectAvatar}
              row={r}
              state={tipState[r.objectAvatar] ?? "idle"}
              onTip={() => handleTip(r.objectAvatar)}
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FriendRow({
  row,
  state,
  onTip,
}: {
  row: TrustRow;
  state: "idle" | "sending" | "success" | "error";
  onTip: () => void;
}) {
  const tipLabel =
    state === "sending"
      ? "Sending…"
      : state === "success"
      ? "✓ Sent"
      : state === "error"
      ? "✗ Failed"
      : "Tip 1 CRC";

  return (
    <div className="cartridge-sm flex items-center gap-3 px-3 py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-2 border-[var(--border)] bg-[oklch(0.13_0.04_245)] text-base">
        👤
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-pixel truncate text-[11px] text-foreground">
          {shortenAddress(row.objectAvatar)}
        </span>
        <span className="font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">
          {row.relation === "mutuallyTrusts" ? "Mutual" : "You trust"}
        </span>
      </div>
      <button
        type="button"
        onClick={onTip}
        disabled={state === "sending" || state === "success"}
        className={cn(
          "btn-pixel font-pixel rounded-md px-3 py-1.5 text-[10px] uppercase tracking-wider transition-colors",
          state === "success"
            ? "bg-[oklch(0.55_0.16_140)] text-[var(--cream)]"
            : state === "error"
            ? "bg-destructive text-[var(--cream)]"
            : "bg-[var(--species-accent)] text-[var(--cream)]",
          "disabled:opacity-70",
        )}
      >
        {tipLabel}
      </button>
    </div>
  );
}

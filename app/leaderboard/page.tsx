"use client";

import { useState } from "react";

import { Blob } from "@/components/hatch/Blob";
import { useSdk } from "@/components/wallet/SdkProvider";
import { useWallet } from "@/components/wallet/WalletProvider";
import {
  useFriendsLeaderboard,
  type LeaderboardRow,
} from "@/lib/use-friends-leaderboard";
import {
  SPECIES,
  STAGE_META,
  nameFromSeed,
  speciesFromAddress,
} from "@/lib/hatch";
import { cn, shortenAddress } from "@/lib/utils";

type AvatarLike = {
  transfer: { advanced: (to: string, amount: bigint) => Promise<unknown> };
};

type TipState = Record<string, "idle" | "sending" | "success" | "error">;

export default function LeaderboardPage() {
  const wallet = useWallet();
  const sdk = useSdk();
  const { rows, loading, error } = useFriendsLeaderboard();
  const [tip, setTip] = useState<TipState>({});

  const sendTip = async (target: string) => {
    if (sdk.kind !== "ready" || !sdk.avatar) return;
    setTip((t) => ({ ...t, [target]: "sending" }));
    try {
      await (sdk.avatar as AvatarLike).transfer.advanced(target, BigInt(1e18));
      setTip((t) => ({ ...t, [target]: "success" }));
      setTimeout(() => setTip((t) => ({ ...t, [target]: "idle" })), 2400);
    } catch (err) {
      console.error("[tip] failed:", err);
      setTip((t) => ({ ...t, [target]: "error" }));
      setTimeout(() => setTip((t) => ({ ...t, [target]: "idle" })), 3200);
    }
  };

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-12">
      {/* ── Title ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 px-1">
        <div>
          <p className="font-pixel text-[10px] uppercase tracking-[0.25em] text-[var(--species-accent)]">
            Leaderboard
          </p>
          <h1 className="font-pixel mt-1 text-2xl text-foreground sm:text-3xl">
            Your trust circle, ranked.
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Visit any friend, feed their blob, watch them climb. Refresh after
            tipping to see the order shift.
          </p>
        </div>
      </div>

      {/* ── Empty states ──────────────────────────────────────── */}
      {!wallet.address && (
        <CartridgeMsg
          icon="🛰"
          title="Open inside Circles to see your leaderboard"
        />
      )}

      {wallet.address && sdk.kind === "ready" && !sdk.hasAvatar && (
        <CartridgeMsg
          icon="🐣"
          title="Register a Circles avatar first"
          subtitle="Sign up at metri.xyz, then trust some folks to build your leaderboard."
        />
      )}

      {sdk.kind === "ready" && sdk.hasAvatar && loading && rows.length === 0 && (
        <CartridgeMsg
          icon="⏳"
          title="Computing your friends' XP…"
          subtitle="One RPC roundtrip per friend — usually 1-3 seconds."
        />
      )}

      {sdk.kind === "ready" && sdk.hasAvatar && !loading && rows.length === 0 && !error && (
        <CartridgeMsg
          icon="🌱"
          title="No friends in your trust circle yet"
          subtitle="Trust someone on Circles, come back, and they'll show up here."
        />
      )}

      {error && (
        <div className="cartridge p-5">
          <p className="font-pixel text-[10px] uppercase tracking-wider text-destructive">
            Couldn&apos;t build leaderboard
          </p>
          <p className="mt-2 break-all text-xs text-muted-foreground">{error}</p>
        </div>
      )}

      {/* ── Top 3 podium ──────────────────────────────────────── */}
      {top3.length > 0 && (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {top3.map((row, i) => (
            <PodiumCard
              key={row.address}
              row={row}
              rank={i + 1}
              tipState={tip[row.address] ?? "idle"}
              onTip={() => sendTip(row.address)}
              canTip={sdk.kind === "ready" && sdk.hasAvatar}
            />
          ))}
        </section>
      )}

      {/* ── Rest of the list ──────────────────────────────────── */}
      {rest.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="font-pixel px-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Climbing the ranks
          </p>
          {rest.map((row, i) => (
            <ListRow
              key={row.address}
              row={row}
              rank={i + 4}
              tipState={tip[row.address] ?? "idle"}
              onTip={() => sendTip(row.address)}
              canTip={sdk.kind === "ready" && sdk.hasAvatar}
            />
          ))}
        </section>
      )}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */

function PodiumCard({
  row,
  rank,
  tipState,
  onTip,
  canTip,
}: {
  row: LeaderboardRow;
  rank: 1 | 2 | 3 | number;
  tipState: "idle" | "sending" | "success" | "error";
  onTip: () => void;
  canTip: boolean;
}) {
  const species = speciesFromAddress(row.address);
  const meta = SPECIES[species];
  const stageMeta = STAGE_META[row.stage];
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";

  return (
    <div
      className={cn(
        "cartridge relative flex flex-col items-center gap-2 p-4 text-center",
        rank === 1 && "ring-2 ring-[var(--gold)] ring-offset-2 ring-offset-background",
      )}
    >
      <span className="absolute right-3 top-3 text-2xl" aria-hidden>
        {medal}
      </span>

      <div className="my-2">
        <Blob species={species} stage={row.stage} size={120} />
      </div>

      <span className="font-pixel truncate text-sm text-foreground">
        {row.name ?? capitalize(nameFromSeed(row.address))}
      </span>
      <span className="font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">
        {shortenAddress(row.address)}
      </span>

      <div className="flex items-center gap-2 text-[10px]">
        <span aria-hidden>{meta.icon}</span>
        <span className="font-pixel uppercase tracking-wider text-muted-foreground">
          {meta.label} · {stageMeta.label}
        </span>
      </div>

      <div className="font-pixel mt-1 text-base text-[var(--species-accent)]">
        {fmtXp(row.xp)} XP
      </div>

      <TipBtn state={tipState} onTip={onTip} disabled={!canTip} />
    </div>
  );
}

function ListRow({
  row,
  rank,
  tipState,
  onTip,
  canTip,
}: {
  row: LeaderboardRow;
  rank: number;
  tipState: "idle" | "sending" | "success" | "error";
  onTip: () => void;
  canTip: boolean;
}) {
  const species = speciesFromAddress(row.address);
  const meta = SPECIES[species];
  const stageMeta = STAGE_META[row.stage];

  return (
    <div className="cartridge-sm flex items-center gap-3 px-3 py-2.5">
      <span className="font-pixel w-6 text-center text-[11px] text-muted-foreground">
        #{rank}
      </span>
      <div className="shrink-0">
        <Blob species={species} stage={row.stage} size={56} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-pixel truncate text-[11px] text-foreground">
          {row.name ?? capitalize(nameFromSeed(row.address))}
        </span>
        <span className="font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">
          {meta.icon} {meta.label} · {stageMeta.label} ·{" "}
          {shortenAddress(row.address)}
        </span>
      </div>
      <div className="font-pixel flex shrink-0 flex-col items-end gap-0.5 text-[11px] text-[var(--species-accent)]">
        {fmtXp(row.xp)} XP
      </div>
      <TipBtn state={tipState} onTip={onTip} disabled={!canTip} small />
    </div>
  );
}

function TipBtn({
  state,
  onTip,
  disabled,
  small,
}: {
  state: "idle" | "sending" | "success" | "error";
  onTip: () => void;
  disabled?: boolean;
  small?: boolean;
}) {
  const label =
    state === "sending"
      ? "…"
      : state === "success"
      ? "✓"
      : state === "error"
      ? "✗"
      : "Tip 1 CRC";

  return (
    <button
      type="button"
      onClick={onTip}
      disabled={disabled || state === "sending" || state === "success"}
      className={cn(
        "btn-pixel font-pixel rounded-md uppercase tracking-wider transition-colors",
        small ? "px-2.5 py-1.5 text-[10px]" : "px-3 py-1.5 text-[10px]",
        state === "success"
          ? "bg-[oklch(0.55_0.16_140)] text-[var(--cream)]"
          : state === "error"
          ? "bg-destructive text-[var(--cream)]"
          : "bg-[var(--species-accent)] text-[var(--cream)]",
        "disabled:opacity-60",
      )}
    >
      {label}
    </button>
  );
}

function CartridgeMsg({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="cartridge grid min-h-48 place-items-center p-8">
      <div className="text-center">
        <p aria-hidden className="text-3xl">{icon}</p>
        <p className="font-pixel mt-4 text-[10px] uppercase tracking-wider text-foreground">
          {title}
        </p>
        {subtitle && (
          <p className="mt-2 max-w-xs text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function fmtXp(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  if (n >= 10) return n.toFixed(0);
  return n.toFixed(1);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

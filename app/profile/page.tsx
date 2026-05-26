"use client";

import { useEffect, useState } from "react";

import { useSdk } from "@/components/wallet/SdkProvider";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useProfile } from "@/lib/use-profile";
import { useBlobProgress } from "@/lib/use-blob-progress";
import { useEggState } from "@/lib/use-egg-state";
import { SPECIES, speciesFromAddress, stageFromXp } from "@/lib/hatch";
import { shortenAddress } from "@/lib/utils";

type ProfileViewRich = {
  avatarInfo?: { type?: string; version?: number; cidV0?: string };
  v2Balance?: string;
  v1Balance?: string;
  trustStats?: { trustsCount?: number; trustedByCount?: number };
};

type SdkRead = {
  rpc: {
    profile: {
      getProfileView: (addr: `0x${string}`) => Promise<ProfileViewRich>;
    };
  };
};

export default function ProfilePage() {
  const wallet = useWallet();
  const sdk = useSdk();
  const profile = useProfile();
  const progress = useBlobProgress();
  const egg = useEggState(wallet.address);

  const [rich, setRich] = useState<ProfileViewRich | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sdk.kind !== "ready") return;
    let cancelled = false;
    (async () => {
      try {
        const s = sdk.sdk as SdkRead;
        const view = await s.rpc.profile.getProfileView(sdk.address);
        if (!cancelled) setRich(view);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sdk]);

  // Use the egg-picker choice if made; address-derived otherwise.
  const species =
    egg.state.currentSpecies ??
    (wallet.address ? speciesFromAddress(wallet.address) : "aqua");
  const meta = SPECIES[species];
  const currentXp = Math.max(0, progress.xp - egg.state.xpCheckpoint);
  const currentStage = stageFromXp(currentXp);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-12">
      <div className="px-1">
        <p className="font-pixel text-[10px] uppercase tracking-[0.25em] text-[var(--species-accent)]">
          Profile
        </p>
        <h1 className="font-pixel mt-1 text-2xl text-foreground sm:text-3xl">
          Who you are on Circles.
        </h1>
      </div>

      {!wallet.address && (
        <div className="cartridge p-5 text-center">
          <p aria-hidden className="text-3xl">🛰</p>
          <p className="font-pixel mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
            Open inside the Circles host to see your profile.
          </p>
        </div>
      )}

      {wallet.address && sdk.kind === "ready" && !sdk.hasAvatar && (
        <div className="cartridge p-5 text-center">
          <p aria-hidden className="text-3xl">🐣</p>
          <p className="font-pixel mt-3 text-[10px] uppercase tracking-wider text-foreground">
            You&apos;re not a Circles avatar yet
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Sign up at{" "}
            <a
              className="text-[var(--species-accent)] underline"
              href="https://app.metri.xyz"
              target="_blank"
              rel="noreferrer"
            >
              metri.xyz
            </a>{" "}
            to claim an avatar and start growing your blob.
          </p>
        </div>
      )}

      {sdk.kind === "ready" && sdk.hasAvatar && (
        <>
          {/* Identity card */}
          <div className="cartridge p-5">
            <div className="flex items-center gap-4">
              {profile?.previewImageUrl || profile?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.previewImageUrl ?? profile.imageUrl}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-md border-2 border-[var(--border)] object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border-2 border-[var(--border)] bg-[oklch(0.13_0.04_var(--world-hue))] text-2xl">
                  {meta.icon}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-pixel truncate text-base text-foreground">
                  {profile?.name?.trim() || "Unnamed avatar"}
                </p>
                <p className="font-mono mt-1 text-[10px] text-muted-foreground">
                  {sdk.address}
                </p>
                {profile?.location && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    📍 {profile.location}
                  </p>
                )}
              </div>
            </div>

            {profile?.description && (
              <p className="mt-4 whitespace-pre-wrap border-t border-[var(--border)] pt-4 text-xs text-muted-foreground">
                {profile.description}
              </p>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBlock label="Species" value={meta.label} icon={meta.icon} />
            <StatBlock
              label="Stage"
              value={currentStage.charAt(0).toUpperCase() + currentStage.slice(1)}
              icon="🐣"
            />
            <StatBlock
              label="CRC v2"
              value={formatCrc(rich?.v2Balance)}
              icon="💰"
            />
            <StatBlock
              label="Trust"
              value={`${rich?.trustStats?.trustsCount ?? 0} · ${rich?.trustStats?.trustedByCount ?? 0}`}
              icon="🤝"
              hint="out · in"
            />
          </div>

          {/* Address card */}
          <div className="cartridge p-5">
            <p className="font-pixel text-[10px] uppercase tracking-wider text-muted-foreground">
              Wallet address
            </p>
            <p className="font-mono mt-2 break-all text-xs text-foreground">
              {sdk.address}
            </p>
            <p className="font-pixel mt-3 text-[9px] uppercase tracking-wider text-muted-foreground">
              short: {shortenAddress(sdk.address)}
            </p>
          </div>

          {error && (
            <p className="font-pixel text-[10px] uppercase tracking-wider text-destructive">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function StatBlock({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string;
  icon: string;
  hint?: string;
}) {
  return (
    <div className="cartridge-sm flex flex-col gap-2 p-4">
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-base">{icon}</span>
        <span className="font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <span className="font-pixel text-sm text-foreground">{value}</span>
      {hint && (
        <span className="font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">
          {hint}
        </span>
      )}
    </div>
  );
}

function formatCrc(value: string | undefined): string {
  if (!value) return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

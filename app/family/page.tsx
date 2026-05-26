"use client";

import { useEffect, useState } from "react";

import { Blob } from "@/components/hatch/Blob";
import { useSdk } from "@/components/wallet/SdkProvider";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useBlobProgress } from "@/lib/use-blob-progress";
import {
  SPECIES,
  STAGE_META,
  speciesFromAddress,
  type Species,
} from "@/lib/hatch";
import { cn, shortenAddress } from "@/lib/utils";

type TrustRow = {
  subjectAvatar: string;
  objectAvatar: string;
  relation: "trusts" | "trustedBy" | "mutuallyTrusts";
  timestamp: number;
};

type AvatarLike = {
  trust: { getAll: () => Promise<TrustRow[]> };
};

export default function FamilyPage() {
  const wallet = useWallet();
  const sdk = useSdk();
  const progress = useBlobProgress();

  const [trustList, setTrustList] = useState<TrustRow[] | null>(null);

  useEffect(() => {
    if (sdk.kind !== "ready" || !sdk.hasAvatar || !sdk.avatar) return;
    let cancelled = false;
    (async () => {
      try {
        const avatar = sdk.avatar as AvatarLike;
        const all = await avatar.trust.getAll();
        if (cancelled) return;
        setTrustList(all);
      } catch {
        if (cancelled) return;
        setTrustList([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sdk]);

  // Paint world to match the active species so /family stays cohesive
  // even when the user navigates here directly.
  const mySpecies: Species = wallet.address
    ? speciesFromAddress(wallet.address)
    : "aqua";

  useEffect(() => {
    document.documentElement.dataset.species = mySpecies;
    document.cookie = `hatch_species=${mySpecies}; max-age=31536000; path=/; SameSite=Lax`;
  }, [mySpecies]);

  const stageMeta = STAGE_META[progress.stage];
  const speciesMeta = SPECIES[mySpecies];
  const isAdult = progress.stage === "adult";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-12">
      {/* ── Title ─────────────────────────────────────────────── */}
      <div className="px-1">
        <p className="font-pixel text-[10px] uppercase tracking-[0.25em] text-[var(--species-accent)]">
          Family Album
        </p>
        <h1 className="font-pixel mt-1 text-2xl text-foreground sm:text-3xl">
          Your nest&apos;s grown creatures.
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Each blob you raise to Adult joins this album. Trusted friends sit
          below — visit their nest from the home page.
        </p>
      </div>

      {/* ── Your blob ─────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <p className="font-pixel px-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          Your blob
        </p>
        <div
          className={cn(
            "cartridge relative flex items-center gap-4 p-5",
            isAdult && "ring-2 ring-[var(--species-accent)] ring-offset-2 ring-offset-background",
          )}
        >
          {/* sprite */}
          <div className="shrink-0">
            <Blob species={mySpecies} stage={progress.stage} size={140} />
          </div>

          {/* meta */}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <span aria-hidden className="text-base">{speciesMeta.icon}</span>
              <span className="font-pixel text-sm uppercase tracking-wider text-foreground">
                {speciesMeta.label}
              </span>
              <span className="font-pixel text-[10px] uppercase tracking-wider text-muted-foreground">
                · {stageMeta.label}
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              {speciesMeta.blurb}
            </p>

            <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground">XP</span>
              <span className="font-pixel text-foreground">
                {Math.floor(progress.xp)} CRC
              </span>
              <span className="text-muted-foreground">Fed by</span>
              <span className="font-pixel text-foreground">
                {progress.feedersCount} friend{progress.feedersCount === 1 ? "" : "s"}
              </span>
              <span className="text-muted-foreground">Total feeds</span>
              <span className="font-pixel text-foreground">
                {progress.totalIncoming}
              </span>
              {isAdult && (
                <>
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-pixel text-[var(--species-accent)]">
                    ★ Adult — joined the album
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust circle ──────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <p className="font-pixel px-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          Your trust circle
        </p>

        {!wallet.address && (
          <div className="cartridge p-5 text-center text-xs text-muted-foreground">
            Connect inside Circles to see your friends.
          </div>
        )}

        {wallet.address && trustList === null && (
          <div className="cartridge p-5 text-center">
            <p className="font-pixel text-[10px] uppercase tracking-wider text-muted-foreground">
              Loading trust graph…
            </p>
          </div>
        )}

        {trustList && trustList.length === 0 && (
          <div className="cartridge p-5 text-center">
            <p aria-hidden className="text-2xl">🌱</p>
            <p className="font-pixel mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
              No trust links yet.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Trust someone on Circles and they&apos;ll appear here as a nest of
              their own species.
            </p>
          </div>
        )}

        {trustList && trustList.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {trustList.map((row) => (
              <FriendNestCard key={row.objectAvatar} row={row} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FriendNestCard({ row }: { row: TrustRow }) {
  const species = speciesFromAddress(row.objectAvatar);
  const meta = SPECIES[species];

  return (
    <div className="cartridge-sm relative flex flex-col items-center gap-2 p-4 text-center">
      <div className="my-1">
        {/* Stage is unknown for other people without an extra RPC call —
            we show them at "teen" as a neutral, recognisable form. */}
        <Blob species={species} stage="teen" size={96} />
      </div>
      <span className="font-pixel text-[11px] text-foreground">
        {shortenAddress(row.objectAvatar)}
      </span>
      <span className="font-pixel flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        <span aria-hidden>{meta.icon}</span>
        <span>{meta.label}</span>
      </span>
      <span className="font-pixel text-[9px] uppercase tracking-wider text-[var(--species-accent)]">
        {row.relation === "mutuallyTrusts"
          ? "Mutual"
          : row.relation === "trusts"
          ? "You trust"
          : "Trusts you"}
      </span>
    </div>
  );
}

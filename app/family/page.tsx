"use client";

import { useEffect, useState } from "react";

import { Blob } from "@/components/hatch/Blob";
import { useSdk } from "@/components/wallet/SdkProvider";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useBlobProgress } from "@/lib/use-blob-progress";
import { useEggState } from "@/lib/use-egg-state";
import {
  SPECIES,
  STAGE_META,
  speciesFromAddress,
  stageFromXp,
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
  const egg = useEggState(wallet.address);

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

  // Active species follows the egg picker; falls back to address-derived
  // before the user has made a choice.
  const fallbackSpecies: Species = wallet.address
    ? speciesFromAddress(wallet.address)
    : "aqua";
  const mySpecies: Species = egg.state.currentSpecies ?? fallbackSpecies;

  useEffect(() => {
    document.documentElement.dataset.species = mySpecies;
    document.cookie = `hatch_species=${mySpecies}; max-age=31536000; path=/; SameSite=Lax`;
  }, [mySpecies]);

  // Current blob's progress within its own life (resets on graduation).
  const currentXp = Math.max(0, progress.xp - egg.state.xpCheckpoint);
  const currentStage = stageFromXp(currentXp);
  const stageMeta = STAGE_META[currentStage];
  const speciesMeta = SPECIES[mySpecies];
  const familyCount = egg.state.family.length;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-12">
      {/* Title */}
      <div className="px-1">
        <p className="font-pixel text-[10px] uppercase tracking-[0.25em] text-[var(--species-accent)]">
          Family Album · {String(familyCount).padStart(2, "0")} grown
        </p>
        <h1 className="font-pixel mt-1 text-2xl text-foreground sm:text-3xl">
          Your nest&apos;s lineage.
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Every blob you graduate joins this album. Pick a new egg from the
          Nest page to start the next one.
        </p>
      </div>

      {/* ── Album of graduated blobs ───────────────────────────── */}
      {familyCount > 0 && (
        <section className="flex flex-col gap-3">
          <p className="font-pixel px-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Graduated
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {egg.state.family.map((s, i) => (
              <GraduatedCard key={`${s}-${i}`} species={s} order={i + 1} />
            ))}
          </div>
        </section>
      )}

      {/* ── Currently growing ──────────────────────────────────── */}
      {egg.state.currentSpecies && (
        <section className="flex flex-col gap-3">
          <p className="font-pixel px-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Growing now
          </p>
          <div
            className={cn(
              "cartridge relative flex items-center gap-4 p-5",
              currentStage === "adult" &&
                "ring-2 ring-[var(--species-accent)] ring-offset-2 ring-offset-background",
            )}
          >
            <div className="shrink-0">
              <Blob species={mySpecies} stage={currentStage} size={140} />
            </div>

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
                <span className="text-muted-foreground">XP this life</span>
                <span className="font-pixel text-foreground">
                  {Math.floor(currentXp)} CRC
                </span>
                <span className="text-muted-foreground">Fed by</span>
                <span className="font-pixel text-foreground">
                  {progress.feedersCount} friend{progress.feedersCount === 1 ? "" : "s"}
                </span>
                {currentStage === "adult" && (
                  <>
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-pixel text-[var(--species-accent)]">
                      ★ Ready to graduate
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Empty state ────────────────────────────────────────── */}
      {familyCount === 0 && !egg.state.currentSpecies && (
        <div className="cartridge grid min-h-48 place-items-center p-8">
          <div className="text-center">
            <p aria-hidden className="text-3xl">🥚</p>
            <p className="font-pixel mt-4 text-[10px] uppercase tracking-wider text-muted-foreground">
              No blobs yet
            </p>
            <p className="mt-2 max-w-xs text-xs text-muted-foreground">
              Go to the Nest page to pick your first egg.
            </p>
          </div>
        </div>
      )}

      {/* ── Trust circle ───────────────────────────────────────── */}
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

function GraduatedCard({ species, order }: { species: Species; order: number }) {
  const meta = SPECIES[species];
  return (
    <div className="cartridge-sm relative flex flex-col items-center gap-2 p-4 text-center">
      <span className="font-pixel absolute right-2 top-2 text-[9px] uppercase tracking-wider text-muted-foreground">
        #{String(order).padStart(2, "0")}
      </span>
      <div className="my-1">
        <Blob species={species} stage="adult" size={96} />
      </div>
      <span aria-hidden className="text-base">{meta.icon}</span>
      <span className="font-pixel text-[11px] uppercase tracking-wider text-foreground">
        {meta.label}
      </span>
      <span className="font-pixel text-[9px] uppercase tracking-wider text-[var(--species-accent)]">
        ★ Adult
      </span>
    </div>
  );
}

function FriendNestCard({ row }: { row: TrustRow }) {
  const species = speciesFromAddress(row.objectAvatar);
  const meta = SPECIES[species];

  return (
    <div className="cartridge-sm relative flex flex-col items-center gap-2 p-4 text-center">
      <div className="my-1">
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

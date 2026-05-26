"use client";

import { useEffect, useState } from "react";

import { Blob } from "@/components/hatch/Blob";
import { FeedButton } from "@/components/hatch/FeedButton";
import { FriendsDialog } from "@/components/hatch/FriendsDialog";
import { Scene } from "@/components/hatch/Scene";
import { SpeciesCycler } from "@/components/hatch/SpeciesCycler";
import { StageCycler } from "@/components/hatch/StageCycler";
import { StatTile } from "@/components/hatch/StatTile";
import { XPBar } from "@/components/hatch/XPBar";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useSdk } from "@/components/wallet/SdkProvider";
import { useBlobProgress } from "@/lib/use-blob-progress";
import { useProfile } from "@/lib/use-profile";
import {
  SPECIES,
  STAGE_META,
  nameFromSeed,
  speciesFromAddress,
  xpInStage,
  type Species,
  type Stage,
} from "@/lib/hatch";

export default function HatchHomePage() {
  // Debug toggle: ?debug=1 in the URL. Reads window after mount so the
  // route can still prerender statically (hydration takes over from there).
  const [isDebug, setIsDebug] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDebug(sp.get("debug") === "1");
  }, []);

  const wallet = useWallet();
  const sdk = useSdk();
  const progress = useBlobProgress();
  const profile = useProfile();

  // Debug-mode demo state (only used when ?debug=1)
  const [demoSpecies, setDemoSpecies] = useState<Species>("aqua");
  const [demoStage, setDemoStage] = useState<Stage>("teen");

  const [squish, setSquish] = useState(false);
  const triggerSquish = () => {
    setSquish(false);
    requestAnimationFrame(() => setSquish(true));
    setTimeout(() => setSquish(false), 620);
  };

  // ── Derive the active blob view ────────────────────────────────────
  // Real data when we have a wallet, demo overrides when ?debug=1.
  const species: Species = isDebug
    ? demoSpecies
    : wallet.address
    ? speciesFromAddress(wallet.address)
    : "aqua";

  const stage: Stage = isDebug ? demoStage : progress.stage;
  const xp = isDebug ? xpForDemoStage(demoStage) : progress.xp;
  const stageMeta = STAGE_META[stage];
  const within = xpInStage(xp, stage);
  const meta = SPECIES[species];
  // Prefer the user's real Circles profile name; fall back to a deterministic
  // cute name derived from the address if they haven't set one yet.
  const name =
    profile?.name?.trim() ||
    (wallet.address ? capitalize(nameFromSeed(wallet.address)) : "Bubbly");

  // Paint the world to match the active species + persist the choice in a
  // cookie so the inline bootstrap script can pre-apply it on next visit
  // (no palette flash). Cascades through every species-themed CSS var.
  useEffect(() => {
    document.documentElement.dataset.species = species;
    document.cookie = `hatch_species=${species}; max-age=31536000; path=/; SameSite=Lax`;
  }, [species]);

  const onFeedSuccess = () => {
    progress.refresh();
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-12">
      {/* ── Title row ─────────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="font-pixel text-[10px] uppercase tracking-[0.25em] text-[var(--species-accent)]">
            Your Nest · {stageMeta.label_age}
          </p>
          <h1 className="font-pixel mt-1 text-2xl text-foreground sm:text-3xl">
            Hatch your blob.
          </h1>
        </div>
        <FamilyBadge count={stage === "adult" ? 1 : 0} />
      </div>

      {/* ── Nameplate above the tank ──────────────────────────────── */}
      <Nameplate name={name} species={meta.label} icon={meta.icon} />

      {/* ── The diorama ───────────────────────────────────────────── */}
      <Scene height={380} species={species}>
        <div className="relative my-2">
          <Blob species={species} stage={stage} squish={squish} size={300} />
        </div>
      </Scene>

      {/* ── XP bar (real progression) ─────────────────────────────── */}
      <div className="px-1">
        <XPBar
          value={within.value}
          max={within.max}
          label={
            stageMeta.xpExit === null
              ? "Fully grown · joins your family"
              : `XP · ${Math.max(0, Math.ceil(within.max - within.value))} CRC to next stage`
          }
          tone={
            species === "fire"
              ? "fire"
              : species === "plante"
              ? "plante"
              : "aqua"
          }
        />
      </div>

      {/* ── Stat tile grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Age"
          value={ageLabel(progress.firstFedAt) ?? stageMeta.label_age}
          icon="🕒"
          accent="gold"
        />
        <StatTile
          label="Fed by"
          value={`${progress.feedersCount} friend${progress.feedersCount === 1 ? "" : "s"}`}
          icon="👥"
          accent="species"
        />
        <StatTile
          label="Total feeds"
          value={progress.totalIncoming.toString()}
          icon="🍼"
          accent="leaf"
        />
      </div>

      {/* ── Action buttons ────────────────────────────────────────── */}
      <ActionRow
        kind={
          !wallet.isMiniappHost
            ? "standalone"
            : sdk.kind !== "ready"
            ? "loading"
            : !sdk.hasAvatar
            ? "no-avatar"
            : "ready"
        }
        feedSlot={
          <FeedButton onSuccess={onFeedSuccess} squish={triggerSquish} className="flex-1" />
        }
        visitSlot={<FriendsDialog onTipSent={onFeedSuccess} />}
      />

      {/* ── Debug controls (hidden in prod) ───────────────────────── */}
      {isDebug && (
        <section className="mt-2 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 p-4">
          <p className="font-pixel text-[10px] uppercase tracking-wider text-muted-foreground">
            Debug · preview each species & stage
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <SpeciesCycler current={demoSpecies} onChange={setDemoSpecies} />
            <StageCycler current={demoStage} onChange={setDemoStage} />
          </div>
        </section>
      )}
    </div>
  );
}

/* ── Helper subcomponents & utilities ─────────────────────────────── */

function ActionRow({
  kind,
  feedSlot,
  visitSlot,
}: {
  kind: "standalone" | "loading" | "no-avatar" | "ready";
  feedSlot: React.ReactNode;
  visitSlot: React.ReactNode;
}) {
  if (kind === "standalone") {
    return (
      <div className="cartridge flex flex-col items-center gap-3 p-5 text-center">
        <p aria-hidden className="text-3xl">🛰</p>
        <p className="font-pixel text-xs uppercase tracking-wider text-foreground">
          Open inside the Circles host
        </p>
        <p className="text-xs text-muted-foreground">
          Paste this page&apos;s URL into the{" "}
          <a
            className="text-[var(--species-accent)] underline"
            href="https://circles.gnosis.io/playground"
            target="_blank"
            rel="noreferrer"
          >
            Circles playground
          </a>{" "}
          to feed your blob.
        </p>
      </div>
    );
  }

  if (kind === "loading") {
    return (
      <div className="cartridge flex flex-col items-center gap-2 p-5 text-center">
        <p className="font-pixel text-[10px] uppercase tracking-wider text-muted-foreground">
          Waiting for your wallet…
        </p>
      </div>
    );
  }

  if (kind === "no-avatar") {
    return (
      <div className="cartridge flex flex-col items-center gap-3 p-5 text-center">
        <p aria-hidden className="text-3xl">🐣</p>
        <p className="font-pixel text-xs uppercase tracking-wider text-foreground">
          You need a Circles avatar to hatch
        </p>
        <p className="text-xs text-muted-foreground">
          Sign up at{" "}
          <a
            className="text-[var(--species-accent)] underline"
            href="https://app.metri.xyz"
            target="_blank"
            rel="noreferrer"
          >
            metri.xyz
          </a>{" "}
          (free, takes 1 minute). Then come back here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {feedSlot}
      {visitSlot}
    </div>
  );
}

function Nameplate({
  name,
  species,
  icon,
}: {
  name: string;
  species: string;
  icon: string;
}) {
  return (
    <div className="mx-auto flex items-center gap-2.5">
      <Triangle direction="left" />
      <div className="cartridge-sm font-pixel flex items-center gap-3 bg-[var(--card)] px-5 py-2 text-xs uppercase tracking-wider">
        <span aria-hidden className="text-base leading-none">
          {icon}
        </span>
        <span className="text-foreground">{name}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-[var(--species-accent)]">{species}</span>
      </div>
      <Triangle direction="right" />
    </div>
  );
}

function Triangle({ direction }: { direction: "left" | "right" }) {
  return (
    <span
      aria-hidden
      className="block h-2.5 w-2.5"
      style={{
        background: "var(--species-accent)",
        clipPath:
          direction === "left"
            ? "polygon(100% 0, 0 50%, 100% 100%)"
            : "polygon(0 0, 100% 50%, 0 100%)",
      }}
    />
  );
}

function FamilyBadge({ count }: { count: number }) {
  return (
    <div className="cartridge-sm flex items-center gap-3 px-3 py-2">
      <span aria-hidden className="text-lg leading-none">🐾</span>
      <div className="flex flex-col">
        <span className="font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">
          Family
        </span>
        <span className="font-pixel text-base text-foreground">
          {String(count).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}

function xpForDemoStage(stage: Stage): number {
  // Midpoint within each stage, for clean preview.
  const meta = STAGE_META[stage];
  if (meta.xpExit === null) return meta.xpEnter;
  return Math.floor((meta.xpEnter + meta.xpExit) / 2);
}

function ageLabel(firstFedAt: number | null): string | null {
  if (firstFedAt === null) return null;
  const now = Math.floor(Date.now() / 1000);
  const days = Math.max(0, Math.floor((now - firstFedAt) / 86400));
  if (days < 1) return "Day 1";
  return `Day ${days + 1}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

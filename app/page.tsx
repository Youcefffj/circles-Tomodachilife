"use client";

import { useEffect, useState } from "react";

import { Blob } from "@/components/hatch/Blob";
import { EggSelectModal } from "@/components/hatch/EggSelectModal";
import { FeedButton } from "@/components/hatch/FeedButton";
import { FriendsDialog } from "@/components/hatch/FriendsDialog";
import { PixelButton } from "@/components/hatch/PixelButton";
import { Scene } from "@/components/hatch/Scene";
import { SpeciesCycler } from "@/components/hatch/SpeciesCycler";
import { StageCycler } from "@/components/hatch/StageCycler";
import { StatTile } from "@/components/hatch/StatTile";
import { XPBar } from "@/components/hatch/XPBar";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useSdk } from "@/components/wallet/SdkProvider";
import { useBlobProgress } from "@/lib/use-blob-progress";
import { useEggState } from "@/lib/use-egg-state";
import { useProfile } from "@/lib/use-profile";
import {
  SPECIES,
  STAGE_META,
  nameFromSeed,
  speciesFromAddress,
  stageFromXp,
  xpInStage,
  type Species,
  type Stage,
} from "@/lib/hatch";

type TrustRow = { objectAvatar: string; relation: string };
type AvatarLike = {
  trust: { getAll: () => Promise<TrustRow[]> };
  transfer: { advanced: (to: string, amount: bigint) => Promise<unknown> };
};

const EGG_PRICE_CRC = 2;

export default function HatchHomePage() {
  // ── Debug toggle (?debug=1) ─────────────────────────────────────
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
  const egg = useEggState(wallet.address);

  // ── Demo overrides ──────────────────────────────────────────────
  const [demoSpecies, setDemoSpecies] = useState<Species>("aqua");
  const [demoStage, setDemoStage] = useState<Stage>("teen");

  // ── Squish on feed ──────────────────────────────────────────────
  const [squish, setSquish] = useState(false);
  const triggerSquish = () => {
    setSquish(false);
    requestAnimationFrame(() => setSquish(true));
    setTimeout(() => setSquish(false), 620);
  };

  // ── Derive the active blob view ─────────────────────────────────
  // Current XP in this blob = total CRC received minus the checkpoint
  // we locked at the previous graduation. New blobs restart at 0.
  const currentXp = Math.max(0, progress.xp - egg.state.xpCheckpoint);
  const currentStage: Stage = stageFromXp(currentXp);

  // Species selection: stored choice > address fallback > demo override
  const fallbackSpecies: Species = wallet.address
    ? speciesFromAddress(wallet.address)
    : "aqua";
  const species: Species = isDebug
    ? demoSpecies
    : egg.state.currentSpecies ?? fallbackSpecies;
  const stage: Stage = isDebug ? demoStage : currentStage;
  const xp = isDebug ? xpForDemoStage(demoStage) : currentXp;

  const stageMeta = STAGE_META[stage];
  const within = xpInStage(xp, stage);
  const meta = SPECIES[species];
  const name =
    profile?.name?.trim() ||
    (wallet.address ? capitalize(nameFromSeed(wallet.address)) : "Bubbly");

  // ── Egg modal control ──────────────────────────────────────────
  const [eggModalOpen, setEggModalOpen] = useState(false);
  const isFirstEgg = egg.loaded && egg.state.currentSpecies === null;

  // Auto-open on first connect (no choice yet, but everything is loaded).
  useEffect(() => {
    if (
      sdk.kind === "ready" &&
      sdk.hasAvatar &&
      egg.loaded &&
      isFirstEgg &&
      !isDebug
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEggModalOpen(true);
    }
  }, [sdk, egg.loaded, isFirstEgg, isDebug]);

  // ── World repaint ───────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.dataset.species = species;
    document.cookie = `hatch_species=${species}; max-age=31536000; path=/; SameSite=Lax`;
  }, [species]);

  const onFeedSuccess = () => progress.refresh();

  // ── Egg picker handlers ─────────────────────────────────────────
  const handleFreePick = (s: Species) => {
    egg.chooseSpecies(s);
    setEggModalOpen(false);
  };

  const handleRandom = () => {
    const picked = egg.pickRandom();
    setEggModalOpen(false);
    return picked;
  };

  /**
   * Paid choice (2 CRC). Sends to a random member of the user's trust
   * circle — keeps the CRC inside the network. If no trustees, we error
   * out so the user falls back to Random or trusts someone first.
   */
  const handlePaidPick = async (s: Species) => {
    if (sdk.kind !== "ready" || !sdk.avatar) {
      throw new Error("SDK not ready");
    }
    const avatar = sdk.avatar as AvatarLike;
    const trusts = await avatar.trust.getAll();
    const eligible = trusts.filter(
      (r) => r.relation === "trusts" || r.relation === "mutuallyTrusts",
    );
    if (eligible.length === 0) {
      throw new Error("No trusted friend to receive the 2 CRC — pick Random or trust someone first.");
    }
    const target = eligible[Math.floor(Math.random() * eligible.length)].objectAvatar;
    await avatar.transfer.advanced(target, BigInt(EGG_PRICE_CRC) * BigInt(1e18));
    egg.chooseSpecies(s);
    setEggModalOpen(false);
    progress.refresh();
  };

  // Has the current blob graduated? Stage adult + we still have a current species.
  const readyToGraduate =
    !isDebug &&
    egg.loaded &&
    egg.state.currentSpecies !== null &&
    currentStage === "adult";

  const handleGraduate = () => {
    if (!egg.state.currentSpecies) return;
    egg.graduate(progress.xp);
    setEggModalOpen(true);
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-12">
      {/* Title */}
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="font-pixel text-[10px] uppercase tracking-[0.25em] text-[var(--species-accent)]">
            Your Nest · {stageMeta.label_age}
          </p>
          <h1 className="font-pixel mt-1 text-2xl text-foreground sm:text-3xl">
            Hatch your blob.
          </h1>
        </div>
        <FamilyBadge count={egg.state.family.length} />
      </div>

      <Nameplate name={name} species={meta.label} icon={meta.icon} />

      <Scene height={380} species={species}>
        <div className="relative my-2">
          <Blob species={species} stage={stage} squish={squish} size={300} />
        </div>
      </Scene>

      <div className="px-1">
        <XPBar
          value={within.value}
          max={within.max}
          label={
            stageMeta.xpExit === null
              ? "Fully grown · ready to graduate"
              : `XP · ${Math.max(0, Math.ceil(within.max - within.value))} CRC to next stage`
          }
          tone={
            species === "fire" ? "fire" : species === "plante" ? "plante" : "aqua"
          }
        />
      </div>

      {/* Graduate CTA — appears once the blob is fully grown */}
      {readyToGraduate && (
        <div className="cartridge flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-pixel text-[10px] uppercase tracking-wider text-[var(--species-accent)]">
              ★ {meta.label} is fully grown
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add them to your Family album and pick the next egg.
            </p>
          </div>
          <PixelButton
            size="md"
            variant="primary"
            icon="🎓"
            onClick={handleGraduate}
          >
            Graduate · pick next
          </PixelButton>
        </div>
      )}

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

      {isDebug && (
        <section className="mt-2 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 p-4">
          <p className="font-pixel text-[10px] uppercase tracking-wider text-muted-foreground">
            Debug · preview each species & stage
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <SpeciesCycler current={demoSpecies} onChange={setDemoSpecies} />
            <StageCycler current={demoStage} onChange={setDemoStage} />
          </div>
          <PixelButton
            size="md"
            variant="outline"
            onClick={() => setEggModalOpen(true)}
          >
            Open egg picker
          </PixelButton>
        </section>
      )}

      {/* ── Egg picker modal ─────────────────────────────────────── */}
      <EggSelectModal
        open={eggModalOpen}
        isFirstEgg={isFirstEgg}
        onClose={isFirstEgg ? undefined : () => setEggModalOpen(false)}
        onFreePick={handleFreePick}
        onPaidPick={handlePaidPick}
        onRandom={() => {
          const p = handleRandom();
          return p;
        }}
      />
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
    const APP_URL = "https://hatchlife.vercel.app/";
    const PLAYGROUND_URL = `https://circles.gnosis.io/playground?url=${encodeURIComponent(APP_URL)}`;
    return (
      <div className="cartridge flex flex-col items-center gap-4 p-6 text-center">
        <p aria-hidden className="text-3xl">🛰</p>
        <p className="font-pixel text-xs uppercase tracking-wider text-foreground">
          Open inside the Circles host
        </p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Hatch lives inside the Circles miniapp host. Open it through the
          playground — your wallet will be ready.
        </p>
        <a
          href={PLAYGROUND_URL}
          target="_blank"
          rel="noreferrer"
          className="btn-pixel font-pixel rounded-md bg-[var(--species-accent)] px-5 py-2.5 text-[11px] uppercase tracking-wider text-[var(--cream)] hover:bg-[oklch(0.66_0.18_220)]"
        >
          Open in the playground →
        </a>
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

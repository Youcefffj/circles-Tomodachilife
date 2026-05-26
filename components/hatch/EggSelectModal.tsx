"use client";

import { useState } from "react";

import { PixelButton } from "@/components/hatch/PixelButton";
import { Blob } from "@/components/hatch/Blob";
import { SPECIES, SHIPPED_SPECIES, type Species } from "@/lib/hatch";
import { cn } from "@/lib/utils";

type State =
  | { kind: "idle" }
  | { kind: "transferring"; target: Species }
  | { kind: "done"; target: Species }
  | { kind: "error"; target: Species; message: string };

/**
 * The egg-picker modal.
 *
 *   isFirstEgg only controls the heading copy ("Welcome to Hatch" vs
 *   "Pick your next egg"). Pricing is uniform: choosing a specific
 *   species always costs 2 CRC (routed to a random trustée via
 *   transfer.advanced), Random is always free.
 */
export function EggSelectModal({
  open,
  isFirstEgg,
  onClose,
  onPaidPick,
  onRandom,
}: {
  open: boolean;
  isFirstEgg: boolean;
  onClose?: () => void;
  onPaidPick: (species: Species) => Promise<void>;
  onRandom: () => Species;
}) {
  const [state, setState] = useState<State>({ kind: "idle" });

  if (!open) return null;

  const handlePick = async (species: Species) => {
    setState({ kind: "transferring", target: species });
    try {
      await onPaidPick(species);
      setState({ kind: "done", target: species });
    } catch (err) {
      setState({
        kind: "error",
        target: species,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleRandom = () => {
    const picked = onRandom();
    setState({ kind: "done", target: picked });
  };

  const transferringSpecies =
    state.kind === "transferring" ? state.target : null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/70 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="cartridge w-full max-w-lg p-6 sm:p-8">
        <div className="text-center">
          <p className="font-pixel text-[10px] uppercase tracking-[0.25em] text-[var(--species-accent)]">
            {isFirstEgg ? "Welcome to Hatch" : "Pick your next egg"}
          </p>
          <h2 className="font-pixel mt-2 text-xl text-foreground sm:text-2xl">
            Random is free. Picking costs 2 CRC.
          </h2>
          <p className="mt-2 text-xs text-muted-foreground">
            The 2 CRC goes to a random friend in your trust circle — it feeds
            their blob. No trustées yet? Take Random and trust someone later.
          </p>
        </div>

        {/* ── Species cards ───────────────────────────────────────── */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {SHIPPED_SPECIES.map((s) => {
            const meta = SPECIES[s];
            const busy = transferringSpecies === s;
            return (
              <button
                key={s}
                type="button"
                disabled={busy || state.kind === "transferring"}
                onClick={() => handlePick(s)}
                className={cn(
                  "cartridge-sm group flex flex-col items-center gap-2 p-3 transition-transform",
                  "hover:-translate-y-0.5 active:translate-y-0.5",
                  "disabled:opacity-60",
                )}
              >
                <div className="my-1">
                  <Blob species={s} stage="egg" size={84} />
                </div>
                <span aria-hidden className="text-base">{meta.icon}</span>
                <span className="font-pixel text-[11px] uppercase tracking-wider text-foreground">
                  {meta.label}
                </span>
                <span className="font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">
                  {busy ? "Sending…" : "2 CRC"}
                </span>
              </button>
            );
          })}
        </div>

        {state.kind === "error" && (
          <div className="cartridge-sm mt-4 p-3">
            <p className="font-pixel text-[10px] uppercase tracking-wider text-destructive">
              Couldn&apos;t complete the choice
            </p>
            <p className="mt-1 break-all text-[10px] text-muted-foreground">
              {state.message}
            </p>
          </div>
        )}

        {/* ── Random + dismiss ────────────────────────────────────── */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <PixelButton
            size="lg"
            variant="outline"
            icon="🎲"
            onClick={handleRandom}
            disabled={state.kind === "transferring"}
            className="flex-1"
          >
            Random · Free
          </PixelButton>
          {onClose && state.kind !== "transferring" && (
            <button
              type="button"
              onClick={onClose}
              className="font-pixel rounded-md px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Not now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

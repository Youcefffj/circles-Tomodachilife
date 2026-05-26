"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useSdk } from "@/components/wallet/SdkProvider";
import { stageFromXp, type Stage } from "@/lib/hatch";

type HistoryRow = {
  from?: string;
  to?: string;
  /**
   * The indexer returns numeric fields as JSON strings ("1.5") even
   * though the SDK types claim `number`. Always coerce via Number()
   * before arithmetic — `0 + "1.5"` is string concatenation in JS,
   * which silently corrupts the XP sum and locks the stage at egg.
   */
  crc?: number | string;
  staticCircles?: number | string;
  timestamp?: number;
  transactionHash?: string;
};

function rowAmount(r: HistoryRow): number {
  const primary = Number(r.crc ?? 0);
  if (Number.isFinite(primary) && primary > 0) return primary;
  const fallback = Number(r.staticCircles ?? 0);
  if (Number.isFinite(fallback) && fallback > 0) return fallback;
  return 0;
}

type SdkRead = {
  rpc: {
    transaction: {
      getTransactionHistory: (
        addr: `0x${string}`,
        limit?: number,
      ) => Promise<{ results: HistoryRow[] }>;
    };
  };
};

export type BlobProgress = {
  xp: number;
  stage: Stage;
  feedersCount: number;
  feedersSet: Set<string>;
  firstFedAt: number | null;
  lastFedAt: number | null;
  totalIncoming: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const EMPTY: Omit<BlobProgress, "refresh"> = {
  xp: 0,
  stage: "egg",
  feedersCount: 0,
  feedersSet: new Set(),
  firstFedAt: null,
  lastFedAt: null,
  totalIncoming: 0,
  loading: false,
  error: null,
};

/**
 * Reads the user's Circles history (via the raw RPC method to stay robust
 * even when the Avatar wrapper is in a partial state) and derives the
 * blob's progress: incoming CRC = XP, unique senders = feeders, first
 * incoming = hatch date.
 */
export function useBlobProgress(): BlobProgress {
  const sdkState = useSdk();
  const [snapshot, setSnapshot] = useState<Omit<BlobProgress, "refresh">>(EMPTY);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const ready = sdkState.kind === "ready";
  const userAddress = sdkState.kind === "ready" ? sdkState.address : null;
  const sdkRef = useMemo(
    () => (sdkState.kind === "ready" ? (sdkState.sdk as SdkRead) : null),
    [sdkState],
  );

  useEffect(() => {
    if (!ready || !sdkRef || !userAddress) {
      setSnapshot(EMPTY);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setSnapshot((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const page = await sdkRef.rpc.transaction.getTransactionHistory(
          userAddress,
          100,
        );
        const me = userAddress.toLowerCase();
        const incoming = (page.results ?? []).filter(
          (r) => r.to?.toLowerCase() === me,
        );

        let xp = 0;
        let firstFedAt: number | null = null;
        let lastFedAt: number | null = null;
        const feedersSet = new Set<string>();

        for (const r of incoming) {
          xp += rowAmount(r);
          const from = r.from?.toLowerCase();
          if (from && from !== me) feedersSet.add(from);
          if (r.timestamp != null) {
            firstFedAt =
              firstFedAt == null ? r.timestamp : Math.min(firstFedAt, r.timestamp);
            lastFedAt =
              lastFedAt == null ? r.timestamp : Math.max(lastFedAt, r.timestamp);
          }
        }

        if (cancelled) return;
        setSnapshot({
          xp,
          stage: stageFromXp(xp),
          feedersCount: feedersSet.size,
          feedersSet,
          firstFedAt,
          lastFedAt,
          totalIncoming: incoming.length,
          loading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        console.error("[useBlobProgress] load failed:", err);
        setSnapshot((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : String(err),
        }));
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [ready, sdkRef, userAddress, tick]);

  return { ...snapshot, refresh };
}

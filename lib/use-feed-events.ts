"use client";

import { useEffect, useMemo, useState } from "react";

import { useSdk } from "@/components/wallet/SdkProvider";

type HistoryRow = {
  from?: string;
  to?: string;
  crc?: number;
  timestamp?: number;
  transactionHash?: string;
};

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

export type FeedEvent = {
  kind: "in" | "out";
  counterparty: string;
  crc: number;
  timestamp: number;
  txHash?: string;
};

/**
 * Returns the most recent feed-style transfers (in + out) for the user's
 * wallet, ready for chronological display in /hall.
 *
 * Uses the raw RPC method directly (rather than the Avatar wrapper) so
 * the call works even when the SDK avatar is in a partial state — same
 * pattern as the leaderboard.
 */
export function useFeedEvents(limit = 30): {
  events: FeedEvent[];
  loading: boolean;
  error: string | null;
} {
  const sdkState = useSdk();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = sdkState.kind === "ready";
  const userAddress = sdkState.kind === "ready" ? sdkState.address : null;
  const sdkRef = useMemo(
    () => (sdkState.kind === "ready" ? (sdkState.sdk as SdkRead) : null),
    [sdkState],
  );

  useEffect(() => {
    if (!ready || !sdkRef || !userAddress) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEvents([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const page = await sdkRef.rpc.transaction.getTransactionHistory(
          userAddress,
          limit,
        );
        const me = userAddress.toLowerCase();
        const rows: FeedEvent[] = [];
        for (const r of page.results ?? []) {
          const from = r.from?.toLowerCase();
          const to = r.to?.toLowerCase();
          if (!from || !to || !r.timestamp) continue;
          if (to === me && from !== me) {
            rows.push({
              kind: "in",
              counterparty: r.from!,
              crc: r.crc ?? 0,
              timestamp: r.timestamp,
              txHash: r.transactionHash,
            });
          } else if (from === me && to !== me) {
            rows.push({
              kind: "out",
              counterparty: r.to!,
              crc: r.crc ?? 0,
              timestamp: r.timestamp,
              txHash: r.transactionHash,
            });
          }
        }
        rows.sort((a, b) => b.timestamp - a.timestamp);
        if (cancelled) return;
        setEvents(rows);
      } catch (err) {
        if (cancelled) return;
        console.error("[useFeedEvents] load failed:", err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [ready, sdkRef, userAddress, limit]);

  return { events, loading, error };
}

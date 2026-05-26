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

type AvatarLike = {
  history: { getTransactions: (limit?: number) => Promise<{ results: HistoryRow[] }> };
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
 * avatar, ready for chronological display in /hall.
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
  const hasAvatar = sdkState.kind === "ready" ? sdkState.hasAvatar : false;
  const userAddress = sdkState.kind === "ready" ? sdkState.address : null;
  const avatar = useMemo(
    () =>
      sdkState.kind === "ready" && sdkState.hasAvatar
        ? (sdkState.avatar as AvatarLike | null)
        : null,
    [sdkState],
  );

  useEffect(() => {
    if (!ready || !hasAvatar || !avatar || !userAddress) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEvents([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const page = await avatar.history.getTransactions(limit);
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
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [ready, hasAvatar, avatar, userAddress, limit]);

  return { events, loading, error };
}

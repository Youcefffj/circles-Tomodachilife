"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Address } from "viem";

import { useWallet } from "@/components/wallet/WalletProvider";
import { MiniappRunner } from "@/lib/miniapp-runner";

type LooseSdk = unknown;

export type SdkState =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "ready";
      address: Address;
      sdk: LooseSdk;
      avatar: LooseSdk | null;
      hasAvatar: boolean;
    }
  | { kind: "error"; error: string };

const SdkContext = createContext<SdkState>({ kind: "idle" });

/**
 * Builds an `@aboutcircles/sdk` instance + (best-effort) the user's Avatar.
 *
 * Avatar detection is permissive: we try the documented read primitive
 * (`sdk.rpc.profile.getProfileView` returns `undefined` for unregistered
 * EOAs, no throw) *and* the write builder (`sdk.getAvatar` throws for
 * unregistered EOAs). If *either* succeeds, hasAvatar=true.
 *
 * Why both: passkey-Safe accounts (Metri) sometimes return without an
 * `avatarInfo` from getProfileView even when they're fully registered
 * — likely an indexer freshness quirk. getAvatar still resolves them.
 * Treating either signal as authoritative avoids false-negative
 * "you need a Circles avatar" CTAs for real Circles users.
 */
export function SdkProvider({ children }: { children: ReactNode }) {
  const { address } = useWallet();
  const [state, setState] = useState<SdkState>({ kind: "idle" });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!address) {
        if (!cancelled) setState({ kind: "idle" });
        return;
      }

      if (!cancelled) setState({ kind: "loading" });

      try {
        const { Sdk } = await import("@aboutcircles/sdk");

        const runner = new MiniappRunner(address as Address);
        await runner.init();

        const sdk = new (Sdk as unknown as new (
          config?: unknown,
          runner?: unknown,
        ) => unknown)(undefined, runner);

        // Probe 1: documented read primitive (no throw for unregistered EOAs).
        let detectedViaView = false;
        try {
          const view = await (
            sdk as {
              rpc: {
                profile: {
                  getProfileView: (
                    a: Address,
                  ) => Promise<{ avatarInfo?: unknown }>;
                };
              };
            }
          ).rpc.profile.getProfileView(address as Address);
          detectedViaView = !!view.avatarInfo;
        } catch (err) {
          console.warn("[SdkProvider] getProfileView threw:", err);
        }

        // Probe 2: write-capable Avatar (throws "Avatar not found" for
        // unregistered EOAs, but works for some V2 avatars that
        // getProfileView misses).
        let avatar: LooseSdk | null = null;
        try {
          avatar = await (sdk as { getAvatar: (a: Address) => Promise<LooseSdk> })
            .getAvatar(address as Address);
        } catch (err) {
          // Only warn if the first probe also said no — silent otherwise.
          if (!detectedViaView) {
            console.warn("[SdkProvider] getAvatar threw:", err);
          }
        }

        const hasAvatar = detectedViaView || !!avatar;

        if (cancelled) return;
        setState({
          kind: "ready",
          address: address as Address,
          sdk,
          avatar,
          hasAvatar,
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          kind: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [address]);

  return <SdkContext.Provider value={state}>{children}</SdkContext.Provider>;
}

export function useSdk(): SdkState {
  return useContext(SdkContext);
}

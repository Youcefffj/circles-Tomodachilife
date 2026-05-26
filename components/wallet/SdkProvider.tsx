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
 * Lazily builds an `@aboutcircles/sdk` instance + the user's Avatar once a
 * wallet is injected by the host. Re-builds on address change.
 */
export function SdkProvider({ children }: { children: ReactNode }) {
  const { address } = useWallet();
  const [state, setState] = useState<SdkState>({ kind: "idle" });

  useEffect(() => {
    let cancelled = false;

    // All state updates happen inside async work — defers them off the
    // synchronous effect body (React 19 hook-rule friendly).
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

        let avatar: LooseSdk | null = null;
        let hasAvatar = false;
        try {
          avatar = await (sdk as { getAvatar: (a: Address) => Promise<LooseSdk> })
            .getAvatar(address as Address);
          hasAvatar = !!avatar;
        } catch {
          // Not a registered Circles avatar — fall through with no avatar.
        }

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

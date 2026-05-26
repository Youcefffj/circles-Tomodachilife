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
 *
 * Detection of "is this address a registered Circles avatar" uses
 * `sdk.rpc.profile.getProfileView()` (the documented read primitive,
 * which returns `undefined` for unregistered EOAs instead of throwing).
 * The Avatar instance is built separately via `sdk.getAvatar()` so write
 * methods (mint, transfer, trust) have a working ContractRunner. If
 * `getAvatar` throws for a registered avatar (happens when the on-chain
 * cidV0Digest is empty), we keep `hasAvatar=true` and leave avatar=null;
 * write components surface that gracefully.
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

        // ── Detection: is this a registered Circles avatar?
        // Use the read-friendly view, NOT getAvatar — getAvatar throws
        // for valid-but-empty profiles, which would lock out fresh users.
        let hasAvatar = false;
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
          hasAvatar = !!view.avatarInfo;
        } catch (err) {
          console.warn("[SdkProvider] getProfileView failed:", err);
        }

        // ── Write-capable Avatar instance — best-effort. If it throws
        // even when hasAvatar is true, write components show an error
        // when the user tries to act, but reads still work.
        let avatar: LooseSdk | null = null;
        if (hasAvatar) {
          try {
            avatar = await (sdk as { getAvatar: (a: Address) => Promise<LooseSdk> })
              .getAvatar(address as Address);
          } catch (err) {
            console.warn(
              "[SdkProvider] getAvatar failed for registered avatar:",
              err,
            );
          }
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

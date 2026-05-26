"use client";

import { useEffect, useState } from "react";

import { useSdk } from "@/components/wallet/SdkProvider";

export type ProfileView = {
  name?: string;
  description?: string;
  imageUrl?: string;
  previewImageUrl?: string;
  location?: string;
  cidV0?: string;
};

type SdkRead = {
  rpc: {
    profile: {
      getProfileView: (addr: `0x${string}`) => Promise<{
        avatarInfo?: { cidV0?: string };
        profile?: { name?: string };
      }>;
      getProfileByCid?: (cid: string) => Promise<ProfileView | undefined>;
    };
  };
};

/**
 * Fetches the user's Circles profile (name, picture) from the indexer
 * and optionally hydrates richer fields from IPFS via the profile CID.
 *
 * Returns `null` until the SDK is ready; returns `{}` when the user is
 * a registered avatar but with no profile data yet.
 */
export function useProfile(): ProfileView | null {
  const sdkState = useSdk();
  const [profile, setProfile] = useState<ProfileView | null>(null);

  const isReady = sdkState.kind === "ready";
  const userAddress = sdkState.kind === "ready" ? sdkState.address : null;

  useEffect(() => {
    if (!isReady || !userAddress || sdkState.kind !== "ready") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile(null);
      return;
    }

    let cancelled = false;
    const sdk = sdkState.sdk as SdkRead;

    (async () => {
      try {
        const view = await sdk.rpc.profile.getProfileView(userAddress);
        const merged: ProfileView = {
          name: view.profile?.name,
          cidV0: view.avatarInfo?.cidV0,
        };

        // Best-effort IPFS hydration for richer fields.
        if (view.avatarInfo?.cidV0 && sdk.rpc.profile.getProfileByCid) {
          try {
            const full = await sdk.rpc.profile.getProfileByCid(view.avatarInfo.cidV0);
            if (full) {
              merged.name = full.name ?? merged.name;
              merged.description = full.description;
              merged.imageUrl = full.imageUrl;
              merged.previewImageUrl = full.previewImageUrl;
              merged.location = full.location;
            }
          } catch {
            // CID might not resolve — fall through with view-only data.
          }
        }

        if (cancelled) return;
        setProfile(merged);
      } catch {
        if (cancelled) return;
        setProfile({});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isReady, userAddress, sdkState]);

  return profile;
}

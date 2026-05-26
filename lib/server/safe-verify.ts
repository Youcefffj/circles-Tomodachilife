import { createPublicClient, http, type Address, type Hex } from "viem";
import { gnosis } from "viem/chains";

/**
 * EIP-1271 signature verification against the user's Safe on Gnosis Chain.
 *
 * The miniapp host wraps the user's message with EIP-191 prefix-hashing
 * (the default 'erc1271' signature type) before signing through the Safe.
 * Verifiers must therefore call `isValidSignature(eip191Hash, sig)`.
 *
 * Magic return value: 0x1626ba7e   (per ERC-1271).
 */

const MAGIC_VALUE = "0x1626ba7e" as const;

const SAFE_ABI = [
  {
    name: "isValidSignature",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "hash", type: "bytes32" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [{ name: "magicValue", type: "bytes4" }],
  },
] as const;

let publicClient: ReturnType<typeof createPublicClient> | null = null;
function client() {
  if (publicClient) return publicClient;
  publicClient = createPublicClient({
    chain: gnosis,
    transport: http(process.env.GNOSIS_RPC_URL ?? undefined),
  });
  return publicClient;
}

/**
 * Build the EIP-191 prefixed hash for a raw text message — matching the
 * default `signatureType: 'erc1271'` flow of `@aboutcircles/miniapp-sdk`.
 */
export async function eip191Hash(message: string): Promise<Hex> {
  const { hashMessage } = await import("viem");
  return hashMessage(message);
}

export async function verifySafeSignature({
  safeAddress,
  message,
  signature,
}: {
  safeAddress: Address;
  message: string;
  signature: Hex;
}): Promise<boolean> {
  const hash = await eip191Hash(message);
  try {
    const result = await client().readContract({
      address: safeAddress,
      abi: SAFE_ABI,
      functionName: "isValidSignature",
      args: [hash, signature],
    });
    return (result as string).toLowerCase() === MAGIC_VALUE;
  } catch {
    // Contract revert / non-Safe address / etc → treat as invalid.
    return false;
  }
}

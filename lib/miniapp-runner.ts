import { createPublicClient, http, type Address, type PublicClient } from "viem";
import { gnosis } from "viem/chains";
import type {
  BatchRun,
  ContractRunner,
  TransactionRequest,
} from "@aboutcircles/sdk-types";

/**
 * MiniappRunner — bridge between @aboutcircles/sdk (which builds calldata)
 * and the Circles miniapp host (which signs through the user's Safe).
 *
 *   SDK.write()  →  this.sendTransaction(txs)
 *                →  miniapp-sdk.sendTransactions(txs)   (host UI / Safe signs)
 *                →  waitForTransactionReceipt(lastHash) (we resolve chain state)
 *                →  TransactionReceipt back to the SDK
 *
 * For *read* state (gas estimation, contract calls), the SDK uses our
 * publicClient, which we point at Gnosis Chain mainnet.
 *
 * This adapter is required for any write flow: personalToken.mint(),
 * transfer.direct/advanced, trust.add, etc.
 */
export class MiniappRunner implements ContractRunner {
  readonly address: Address;
  readonly publicClient: PublicClient;

  constructor(address: Address) {
    this.address = address;
    this.publicClient = createPublicClient({
      chain: gnosis,
      transport: http(),
    });
  }

  async init(): Promise<void> {
    // No async setup needed — the public client is configured at construct time
    // and the miniapp-sdk wallet bridge is already initialised by WalletProvider.
  }

  async estimateGas(tx: TransactionRequest): Promise<bigint> {
    return this.publicClient.estimateGas({
      account: this.address,
      to: tx.to as Address | undefined,
      data: tx.data as `0x${string}` | undefined,
      value: tx.value ? BigInt(tx.value as string | number | bigint) : undefined,
    });
  }

  async call(tx: TransactionRequest): Promise<string> {
    const { data } = await this.publicClient.call({
      account: this.address,
      to: tx.to as Address,
      data: tx.data as `0x${string}` | undefined,
      value: tx.value ? BigInt(tx.value as string | number | bigint) : undefined,
    });
    return (data ?? "0x") as string;
  }

  /**
   * Send one or more transactions through the host.
   * The host batches them atomically (Safe multi-tx) and returns the tx hashes;
   * we wait for the *last* hash's receipt to give the SDK something to chain on.
   */
  async sendTransaction(txs: TransactionRequest[]) {
    const { sendTransactions } = await import("@aboutcircles/miniapp-sdk");

    const formatted = txs.map((tx) => ({
      to: tx.to as string,
      data: (tx.data as string) ?? "0x",
      value: tx.value !== undefined ? String(tx.value) : "0",
    }));

    const hashes = await sendTransactions(formatted);
    const lastHash = hashes[hashes.length - 1];
    if (!lastHash) {
      throw new Error("host returned no transaction hash");
    }
    return this.publicClient.waitForTransactionReceipt({
      hash: lastHash as `0x${string}`,
    });
  }

  sendBatchTransaction(): BatchRun {
    const queue: TransactionRequest[] = [];
    return {
      addTransaction: (tx) => {
        queue.push(tx);
      },
      run: () => this.sendTransaction(queue),
    };
  }
}

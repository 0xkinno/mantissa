"use client";
import { RpcProvider } from "starknet";
import { STARKNET_RPC_URL, POOL_ADDRESS } from "./config";
import {
  decodePoolLeg,
  normHex,
  POOL_DEPOSIT_SELECTOR,
  POOL_WITHDRAWAL_SELECTOR,
  countPeersInBand,
  roughBandLabel,
  type PoolLeg,
  type PoolLegName,
} from "./poolTrafficCore";

export type BandReport =
  | { status: "ok"; windowBlocks: number; peers: Record<PoolLegName, number>; partial: boolean; bandLabel: string }
  | { status: "unavailable"; reason: string };

const cache = new Map<string, BandReport>();

/**
 * Live per-action disclosure: reads the STRK20 pool's own public Deposit and
 * Withdrawal events for one token over a recent block window and counts how many
 * of them fall in the same rough size band as `amountRaw`. The count is measured
 * from the pool's event log at signing time, never asserted from a static page.
 * Events whose shape the decoder has not seen are skipped rather than guessed.
 */
export async function measurePoolBand(
  token: string,
  amountRaw: bigint,
  opts: { windowBlocks?: number; maxEvents?: number } = {}
): Promise<BandReport> {
  if (!STARKNET_RPC_URL || !POOL_ADDRESS)
    return { status: "unavailable", reason: "RPC not configured" };
  const windowBlocks = opts.windowBlocks ?? 40_000;
  const maxEvents = opts.maxEvents ?? 800;
  const key = `${normHex(token)}:${amountRaw.toString()}:${windowBlocks}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const provider = new RpcProvider({ nodeUrl: STARKNET_RPC_URL });
  let latest: number;
  try {
    latest = await provider.getBlockNumber();
  } catch {
    const block = (await provider.getBlock("latest")) as { block_number: number };
    latest = block.block_number;
  }
  const fromBlock = Math.max(0, latest - windowBlocks);
  const filter: Record<string, unknown> = {
    address: POOL_ADDRESS,
    keys: [[POOL_DEPOSIT_SELECTOR], [POOL_WITHDRAWAL_SELECTOR]],
    fromBlock,
    toBlock: latest,
    chunk_size: 1000,
  };
  let continuation: string | null = null;
  let partial = false;
  const legs: PoolLeg[] = [];
  try {
    for (let page = 0; ; page += 1) {
      const result = (continuation
        ? await provider.getEvents({ ...filter, continuation_token: continuation } as never)
        : await provider.getEvents(filter as never)) as {
        events: Array<{ from_address: string; keys: string[]; data: string[] }>;
        continuation_token?: string | null;
      };
      for (const event of result.events ?? []) {
        if (normHex(event.from_address) !== normHex(POOL_ADDRESS)) continue;
        const leg = decodePoolLeg(event);
        if (leg && normHex(leg.token) === normHex(token)) legs.push(leg);
      }
      continuation = result.continuation_token ?? null;
      if (legs.length >= maxEvents || page >= 4) {
        partial = true;
        break;
      }
      if (!continuation) break;
    }
  } catch (error) {
    return {
      status: "unavailable",
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  const report: BandReport = {
    status: "ok",
    windowBlocks: latest - fromBlock + 1,
    peers: {
      Deposit: countPeersInBand(legs, "Deposit", token, amountRaw),
      Withdrawal: countPeersInBand(legs, "Withdrawal", token, amountRaw),
    },
    partial,
    bandLabel: roughBandLabel(amountRaw),
  };
  cache.set(key, report);
  return report;
}

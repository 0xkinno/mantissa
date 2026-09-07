/**
 * Pure decoding/band logic for the STRK20 pool's public Deposit/Withdrawal legs.
 * Kept free of RPC and framework imports so it can be unit-tested in isolation.
 *
 * Event layouts below are read from real mainnet receipts (shield, unshield,
 * Prism) and cross-checked against scripts/verify-mainnet.mjs. Both the pool
 * Deposit and Withdrawal events carry the token in keys[2]; the Deposit amount is
 * a single felt in data[0], and the Withdrawal amount is the final felt of data.
 * Events whose shape does not match are skipped rather than guessed at.
 */
export type PoolLegName = "Deposit" | "Withdrawal";

export const POOL_DEPOSIT_SELECTOR =
  "0x9149d2123147c5f43d258257fef0b7b969db78269369ebcf5ebb9eef8592f2";
export const POOL_WITHDRAWAL_SELECTOR =
  "0x2eed7e29b3502a726faf503ac4316b7101f3da813654e8df02c13449e03da8";

export interface PoolLeg {
  name: PoolLegName;
  token: string;
  amount: bigint;
}

export const normHex = (value: string | bigint): string =>
  `0x${BigInt(value).toString(16)}`;

export function decodePoolLeg(event: {
  keys?: string[] | null;
  data?: string[] | null;
}): PoolLeg | null {
  const keys = event.keys ?? [];
  const data = event.data ?? [];
  if (!keys.length || !data.length) return null;
  const name = normHex(keys[0]) === POOL_DEPOSIT_SELECTOR ? "Deposit"
    : normHex(keys[0]) === POOL_WITHDRAWAL_SELECTOR ? "Withdrawal"
    : null;
  if (!name) return null;

  if (name === "Deposit") {
    // Observed shape: keys = [selector, account, token]; data = [amount].
    if (keys.length < 3) return null;
    if (data.length !== 1) return null; // a shape we have not seen; do not guess
    return { name, token: normHex(keys[2]), amount: BigInt(data[0]) };
  }

  // Observed shape: keys = [selector, recipient, token]; data = [.., amount].
  if (keys.length < 3 || data.length < 2) return null;
  return { name, token: normHex(keys[2]), amount: BigInt(data[data.length - 1]) };
}

/** Whole token units for an 18-decimal pool token. */
export function wholeUnits(raw: bigint, decimals = 18): bigint {
  return raw / 10n ** BigInt(decimals);
}

/** Order-of-magnitude of a whole-unit amount (-1 for zero). */
export function magnitudeOf(raw: bigint, decimals = 18): number {
  const whole = wholeUnits(raw, decimals);
  if (whole === 0n) return -1;
  return whole.toString().length - 1;
}

/** Two amounts share a "rough size band" when their whole-unit magnitudes match. */
export function sameRoughBand(a: bigint, b: bigint, decimals = 18): boolean {
  const ma = magnitudeOf(a, decimals);
  const mb = magnitudeOf(b, decimals);
  return ma === mb && ma >= 0;
}

export function roughBandLabel(raw: bigint, decimals = 18): string {
  const whole = wholeUnits(raw, decimals);
  if (whole === 0n) return "sub-1 unit";
  const mag = magnitudeOf(whole, 0);
  if (mag <= 0) return "single units";
  if (mag === 1) return "tens of units";
  if (mag === 2) return "hundreds of units";
  return `10^${mag} units`;
}

export function countPeersInBand(
  legs: PoolLeg[],
  name: PoolLegName,
  token: string,
  amount: bigint,
  decimals = 18
): number {
  return legs.filter(
    (leg) =>
      leg.name === name &&
      normHex(leg.token) === normHex(token) &&
      sameRoughBand(leg.amount, amount, decimals)
  ).length;
}
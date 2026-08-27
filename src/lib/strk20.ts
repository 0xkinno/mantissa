"use client";
import type { WalletAccountV6 } from "starknet";
import type { STRK20_ACTION } from "starknet";
import { STRK_TOKEN_ADDRESS, STARKNET_RPC_URL, POOL_ADDRESS } from "./config";
import { RpcProvider } from "starknet";
export type ShieldedBalance = { token: string; raw: bigint };
const felt = (value: bigint) => `0x${value.toString(16)}`;
export const normalizeFelt = (value: string | bigint): string => {
  const raw = typeof value === "bigint" ? value : BigInt(value);
  return `0x${raw.toString(16)}`;
};
export function parseAmount(input: string, decimals = 18): bigint {
  if (!/^\d+(\.\d+)?$/.test(input.trim())) throw new Error("Enter a positive amount, for example 12.5.");
  const [whole, fraction = ""] = input.trim().split(".");
  if (fraction.length > decimals) throw new Error(`Use at most ${decimals} decimal places.`);
  const raw = BigInt(whole) * 10n ** BigInt(decimals) + BigInt((fraction || "").padEnd(decimals, "0") || "0");
  if (raw <= 0n) throw new Error("Amount must be greater than zero.");
  return raw;
}
export const formatAmount = (raw: bigint, decimals = 18) => {
  const base = 10n ** BigInt(decimals); const whole = raw / base;
  const fraction = (raw % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction.slice(0, 4)}` : whole.toString();
};
export async function readShieldedBalances(account: WalletAccountV6): Promise<ShieldedBalance[]> {
  const balances = await account.strk20Balances([]);
  return balances.map((entry) => ({ token: entry.token, raw: BigInt(entry.balance) }));
}
export const shieldAction = (raw: bigint): STRK20_ACTION => ({ type: "deposit", token: normalizeFelt(STRK_TOKEN_ADDRESS), amount: felt(raw) });
export function describeWalletError(error: unknown): string {
  if (error && typeof error === "object") {
    const value = error as { code?: unknown; message?: unknown; data?: unknown };
    return JSON.stringify({ code: value.code, message: value.message, data: value.data }, null, 2);
  }
  return String(error);
}
export const withdrawAction = (raw: bigint, recipient: string, token = STRK_TOKEN_ADDRESS): STRK20_ACTION => ({ type: "withdraw", token: normalizeFelt(token), amount: felt(raw), recipient: normalizeFelt(recipient) });
export const transferAction = (raw: bigint, recipient: string): STRK20_ACTION => ({ type: "transfer", token: normalizeFelt(STRK_TOKEN_ADDRESS), amount: felt(raw), recipient: normalizeFelt(recipient) });
export function buildEndurForgeActions(args: { raw: bigint; account: string; xstrk: string; anonymizer: string }): STRK20_ACTION[] {
  const inToken = normalizeFelt(STRK_TOKEN_ADDRESS); const outToken = normalizeFelt(args.xstrk); const target = normalizeFelt(args.anonymizer); const amount = felt(args.raw); const low = felt(args.raw & ((1n << 128n) - 1n)); const high = felt(args.raw >> 128n);
  return [
    { type: "withdraw", token: inToken, amount, recipient: target },
    { type: "transfer", token: outToken, amount: "OPEN", recipient: normalizeFelt(args.account) },
    { type: "invoke", contract: target, calldata: [inToken, outToken, low, high, "${openNoteIds[0]}"] },
  ];
}
let feeProvider: RpcProvider | undefined;
export async function getPoolFee(): Promise<bigint> {
  feeProvider ??= new RpcProvider({ nodeUrl: STARKNET_RPC_URL });
  const result = await feeProvider.callContract({ contractAddress: POOL_ADDRESS, entrypoint: "get_fee_amount", calldata: [] });
  return BigInt(result[0]);
}

export async function getPublicStrkBalance(address: string): Promise<bigint> {
  feeProvider ??= new RpcProvider({ nodeUrl: STARKNET_RPC_URL });
  const result = await feeProvider.callContract({
    contractAddress: STRK_TOKEN_ADDRESS,
    entrypoint: "balance_of",
    calldata: [address],
  });
  return BigInt(result[0]) + (BigInt(result[1] ?? 0) << 128n);
}

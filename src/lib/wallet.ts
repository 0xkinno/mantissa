"use client";
import { createStore, type Store } from "@starknet-io/get-starknet-discovery";
import { StandardDisconnect } from "@starknet-io/get-starknet-wallet-standard/features";
import { WalletAccountV6 } from "starknet";
import { STARKNET_RPC_URL } from "./config";

export type DiscoveredWallet = ReturnType<Store["getWallets"]>[number];
let store: Store | undefined;
let session: { wallet: DiscoveredWallet; account: WalletAccountV6 } | null = null;
const SESSION_KEY = "mantissa.wallet.name";
const listeners = new Set<() => void>();
export function getWalletStore(): Store { if (!store) store = createStore(); return store; }
export function getWallets(): DiscoveredWallet[] { return getWalletStore().getWallets(); }
export function getWalletSession() { return session; }
export function subscribeWalletSession(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
function emitSession() { listeners.forEach((listener) => listener()); }
export async function connectWallet(wallet: DiscoveredWallet): Promise<WalletAccountV6> {
  if (!STARKNET_RPC_URL) throw new Error("RPC is not configured. Add NEXT_PUBLIC_STARKNET_RPC_URL to .env.local.");
  const account = await WalletAccountV6.connect({ nodeUrl: STARKNET_RPC_URL }, wallet as Parameters<typeof WalletAccountV6.connect>[1]);
  session = { wallet, account };
  if (typeof window !== "undefined") window.localStorage.setItem(SESSION_KEY, wallet.name);
  emitSession();
  return account;
}
export async function restoreWallet(): Promise<WalletAccountV6 | null> {
  if (session) return session.account;
  if (typeof window === "undefined") return null;
  const name = window.localStorage.getItem(SESSION_KEY);
  if (!name) return null;
  const wallet = getWallets().find((candidate) => candidate.name === name);
  if (!wallet) return null;
  try { return await connectWallet(wallet); } catch { window.localStorage.removeItem(SESSION_KEY); return null; }
}
export async function disconnectWallet() {
  const wallet = session?.wallet;
  try {
    await wallet?.features?.[StandardDisconnect]?.disconnect?.();
  } catch { /* wallet disconnect is best effort */ }
  session = null;
  if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
  emitSession();
}
export const shorten = (value: string) => value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;

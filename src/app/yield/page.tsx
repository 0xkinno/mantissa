"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { WalletAccountV6 } from "starknet";
import { motion } from "framer-motion";
import Nav from "@/components/Nav";
import { strategies, buildRecipe } from "@/lib/recipes";
import { parseAmount } from "@/lib/strk20";
import { ENDUR_XSTRK_ADDRESS, VESU_VAULT_ADDRESS } from "@/lib/config";
import {
  getWalletSession,
  restoreWallet,
  shorten,
  subscribeWalletSession,
} from "@/lib/wallet";

export default function YieldPage() {
  const [selected, setSelected] = useState(strategies[0]);
  const [amount, setAmount] = useState("10");
  const [message, setMessage] = useState("");
  const [account, setAccount] = useState<WalletAccountV6 | null>(null);

  useEffect(() => {
    const sync = () => setAccount(getWalletSession()?.account ?? null);
    sync();
    restoreWallet().then(sync);
    const unsubscribe = subscribeWalletSession(sync);
    return () => {
      unsubscribe();
    };
  }, []);

  function preview() {
    try {
      const outputToken =
        selected.slug === "forge" ? ENDUR_XSTRK_ADDRESS : VESU_VAULT_ADDRESS;
      if (!outputToken)
        throw new Error(
          "This strategy needs its verified output-token address configured before validation."
        );
      const plan = buildRecipe(selected, parseAmount(amount), outputToken);
      setMessage(
        `Plan validated: ${plan.steps.length} step and ${
          plan.outputs.length
        } private output. ${
          account
            ? `Wallet ${shorten(
                account.address
              )} is connected; continue in Private actions.`
            : "Connect a wallet from the navigation to continue."
        }`
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not validate strategy."
      );
    }
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--ink)] antialiased">
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="mono text-xs uppercase tracking-[.25em] text-[var(--forest)]">
            Yield desk
          </p>
          <h1 className="editorial mt-4 text-5xl tracking-[-.04em] md:text-6xl">
            Choose where your capital works.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Select Forge for the receipt-proven Endur path, Reservoir for Vesu
            lending, or Prism for a private swap route.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {strategies.map((strategy) => (
            <button
              key={strategy.slug}
              onClick={() => {
                setSelected(strategy);
                setMessage("");
              }}
              className={`rounded-3xl border p-6 text-left transition-all duration-200 ease-out hover:scale-[1.02] ${
                selected.slug === strategy.slug
                  ? "border-[var(--forest)] bg-[#E8F0E6] shadow-[0_0_24px_rgba(45,90,39,0.15)]"
                  : "border-[var(--border)] bg-white hover:border-[var(--ink)]"
              }`}
            >
              <span className="mono text-[10px] uppercase tracking-[.2em] text-[var(--muted)]">
                {strategy.eyebrow}
              </span>
              <h2 className="editorial mt-6 text-3xl md:text-4xl">{strategy.name}</h2>
              <p className="mt-3 min-h-14 text-sm leading-6 text-[var(--muted)]">
                {strategy.description}
              </p>
              <p className="mono mt-6 text-sm font-medium text-[var(--forest)]">
                {strategy.apy}
              </p>
            </button>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-10 max-w-xl rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between gap-4">
            <span className="mono text-xs uppercase tracking-[.15em] text-[var(--muted)]">
              {selected.name} amount
            </span>
            <span className="mono text-xs text-[var(--forest)]">
              {account
                ? `Connected ${shorten(account.address)}`
                : "Wallet not connected"}
            </span>
          </div>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="mt-3 w-full border-b border-[var(--border)] bg-transparent py-3 text-3xl outline-none focus:border-[var(--forest)]"
            inputMode="decimal"
          />
          <button
            onClick={preview}
            className="mt-6 w-full rounded-full bg-[var(--ink)] px-5 py-3.5 text-sm font-medium text-white transition-all duration-200 hover:bg-[var(--forest)]"
          >
            Validate {selected.name} plan
          </button>
          {account && (
            <Link
              href={`/private?strategy=${selected.slug}`}
              className="mt-3 block w-full rounded-full border border-[var(--ink)] px-5 py-3.5 text-center text-sm font-medium transition-all duration-200 hover:bg-[#F5F5F2]"
            >
              Continue with {selected.name} private action
            </Link>
          )}
          {message && (
            <p className="mt-4 rounded-2xl bg-[#EEF2FF] p-4 text-sm text-[var(--indigo)] leading-relaxed">
              {message}
            </p>
          )}
        </motion.div>
      </section>
    </main>
  );
}

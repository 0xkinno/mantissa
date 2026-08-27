"use client";

import { motion } from "framer-motion";
import Nav from "@/components/Nav";

export default function CompliancePage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--ink)] antialiased">
      <Nav />
      <section className="mx-auto max-w-4xl px-6 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="mono text-xs uppercase tracking-[.25em] text-[var(--indigo)]">
            Selective disclosure
          </p>
          <h1 className="editorial mt-4 text-5xl tracking-[-.04em] md:text-6xl">
            Privacy with accountability.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Viewing keys are wallet-owned secrets. MANTISSA never asks the dapp
            to export one or handle private key material; a user shares a
            wallet-generated disclosure with an auditor when required.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-12 rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm md:p-8"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-5">
            <span className="font-medium">Audit handoff</span>
            <span className="mono text-xs text-[var(--muted)]">
              WALLET-MEDIATED
            </span>
          </div>
          <ul className="space-y-4 py-6 text-sm text-[var(--muted)]">
            <li className="flex items-center gap-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E8F0E6] text-xs font-bold text-[var(--forest)]">
                ✓
              </span>
              <span>The wallet controls viewing-key consent</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E8F0E6] text-xs font-bold text-[var(--forest)]">
                ✓
              </span>
              <span>The auditor receives only the selected account disclosure</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FEE2E2] text-xs font-bold text-[#DC2626]">
                ×
              </span>
              <span>MANTISSA cannot read or export your viewing key</span>
            </li>
          </ul>
          <p className="rounded-2xl bg-[#EEF2FF] p-5 text-sm leading-relaxed text-[var(--indigo)]">
            Open your privacy wallet&apos;s viewing-key or audit-export flow,
            approve the exact scope, and paste the resulting disclosure into your
            auditor&apos;s secure channel. This boundary is intentional: the dapp
            must not custody viewing keys.
          </p>
        </motion.div>
      </section>
    </main>
  );
}

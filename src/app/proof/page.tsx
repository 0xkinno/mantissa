"use client";

import { motion } from "framer-motion";
import Nav from "@/components/Nav";
import { explorerContract, explorerTx, POOL_ADDRESS } from "@/lib/config";
import evidence from "../../../strk20.json";

export default function ProofPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--ink)] antialiased">
      <Nav />
      <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="mono text-xs uppercase tracking-[.25em] text-[var(--forest)]">
            Evidence room
          </p>
          <h1 className="editorial mt-4 text-5xl tracking-[-.04em] md:text-6xl">
            What we proved.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Every live claim belongs here: transaction receipts, deployed
            contracts, and the exact STRK20 primitive each action exercises.
          </p>
        </motion.div>

        {/* Transactions Table Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-12 overflow-x-auto rounded-3xl border border-[var(--border)] bg-white shadow-sm"
        >
          <div className="border-b border-[var(--border)] px-6 py-4">
            <span className="mono text-xs uppercase tracking-[.15em] text-[var(--muted)]">
              Verified Transactions
            </span>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs uppercase tracking-[.15em] text-[var(--muted)] bg-[#FAFAF8]">
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Hash</th>
                <th className="px-6 py-4">Explorer</th>
                <th className="px-6 py-4">Network</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {evidence.transactions.map((tx) => (
                <tr
                  key={tx.hash}
                  className="transition-colors duration-150 hover:bg-[#FAFAF8]"
                >
                  <td className="px-6 py-5 font-medium">{tx.kind}</td>
                  <td className="mono max-w-sm break-all px-6 py-5 text-xs text-[var(--muted)]">
                    {tx.hash}
                  </td>
                  <td className="px-6 py-5">
                    <a
                      className="text-[var(--forest)] underline hover:text-black"
                      target="_blank"
                      rel="noreferrer"
                      href={explorerTx(tx.hash)}
                    >
                      Voyager
                    </a>
                    <a
                      className="ml-3 text-[var(--indigo)] underline hover:text-black"
                      target="_blank"
                      rel="noreferrer"
                      href={`https://starkscan.co/tx/${tx.hash}`}
                    >
                      Starkscan
                    </a>
                  </td>
                  <td className="mono px-6 py-5 text-xs">{tx.network}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* Contracts Table Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mt-8 overflow-x-auto rounded-3xl border border-[var(--border)] bg-white shadow-sm"
        >
          <div className="border-b border-[var(--border)] px-6 py-4">
            <span className="mono text-xs uppercase tracking-[.15em] text-[var(--muted)]">
              Deployed Contracts
            </span>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs uppercase tracking-[.15em] text-[var(--muted)] bg-[#FAFAF8]">
                <th className="px-6 py-4">Contract</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4">Class hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {evidence.contracts.map((contract) => (
                <tr
                  key={contract.address}
                  className="transition-colors duration-150 hover:bg-[#FAFAF8]"
                >
                  <td className="px-6 py-5 font-medium">{contract.name}</td>
                  <td className="mono break-all px-6 py-5 text-xs">
                    <a
                      className="text-[var(--forest)] underline hover:text-black"
                      target="_blank"
                      rel="noreferrer"
                      href={explorerContract(contract.address)}
                    >
                      {contract.address}
                    </a>
                  </td>
                  <td className="mono break-all px-6 py-5 text-xs text-[var(--muted)]">
                    {contract.class_hash}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* Canonical Pool Reference Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-8 rounded-3xl border border-[var(--border)] bg-[#F1F0EC] p-6 shadow-sm"
        >
          <p className="mono text-xs uppercase tracking-[.15em] text-[var(--muted)]">
            Canonical pool
          </p>
          <a
            href={explorerContract(POOL_ADDRESS)}
            target="_blank"
            rel="noreferrer"
            className="mono mt-3 block break-all text-sm text-[var(--ink)] underline hover:text-[var(--forest)]"
          >
            {POOL_ADDRESS}
          </a>
        </motion.div>
      </section>
    </main>
  );
}

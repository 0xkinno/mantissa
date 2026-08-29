"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import Nav from "@/components/Nav";
import StatCounter from "@/components/StatCounter";
import HeroBackground from "@/components/visuals/HeroBackground";
import WhyExistsBackground from "@/components/visuals/WhyExistsBackground";
import ThesisBackground from "@/components/visuals/ThesisBackground";
import {
  ShieldedBalancesIcon,
  CustomRouterIcon,
  MultiCallIcon,
  AllowListIcon,
  ConsentGatedIcon,
  ComplianceIcon,
} from "@/components/visuals/IntegrationIcons";
import { strategies } from "@/lib/recipes";
import evidence from "../../strk20.json";

export default function Home() {
  const shouldReduceMotion = useReducedMotion();

  // Motion variants with reduced motion support
  const fadeIn = {
    initial: { opacity: 0, y: shouldReduceMotion ? 0 : 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: shouldReduceMotion ? 0.01 : 0.5, ease: "easeOut" as const },
  };

  const scrollFadeIn = {
    initial: { opacity: 0, y: shouldReduceMotion ? 0 : 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2 },
    transition: { duration: shouldReduceMotion ? 0.01 : 0.5, ease: "easeOut" as const },
  };

  const containerStagger = {
    initial: {},
    whileInView: {},
    viewport: { once: true, amount: 0.15 },
    transition: {
      staggerChildren: shouldReduceMotion ? 0 : 0.08,
    },
  };

  const childFadeIn = {
    initial: { opacity: 0, y: shouldReduceMotion ? 0 : 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: shouldReduceMotion ? 0.01 : 0.4, ease: "easeOut" as const },
  };

  const steps = [
    {
      num: "01",
      title: "Shield",
      desc: "Move STRK into the STRK20 privacy pool",
    },
    {
      num: "02",
      title: "Select",
      desc: "Choose Forge, Reservoir, or Prism",
    },
    {
      num: "03",
      title: "Route",
      desc: "MantissaRouter executes the strategy atomically on-chain",
    },
    {
      num: "04",
      title: "Withdraw",
      desc: "Unshield back to your public wallet, anytime",
    },
  ];

  const integrationCards = [
    {
      title: "Shielded Balances",
      desc: "Private STRK held as notes, not public state",
      Icon: ShieldedBalancesIcon,
      accent: "forest" as const,
    },
    {
      title: "Custom Anonymizer Router",
      desc: "MantissaRouter executes DeFi calls inside the pool's single invoke",
      Icon: CustomRouterIcon,
      accent: "forest" as const,
    },
    {
      title: "Multi-Call Composability",
      desc: "Withdraw, execute, and reshield in one atomic transaction",
      Icon: MultiCallIcon,
      accent: "indigo" as const,
    },
    {
      title: "Protocol Allow-List",
      desc: "Only verified Endur, Vesu, and AVNU contracts are callable",
      Icon: AllowListIcon,
      accent: "forest" as const,
    },
    {
      title: "Consent-Gated Reads",
      desc: "Private balances are never read without explicit wallet approval",
      Icon: ConsentGatedIcon,
      accent: "indigo" as const,
    },
    {
      title: "Wallet-Mediated Compliance",
      desc: "Selective disclosure stays under the user's own wallet, never the dapp",
      Icon: ComplianceIcon,
      accent: "forest" as const,
    },
  ];

  const invariants = [
    {
      num: "01",
      name: "Pool-only caller",
      desc: "Router only accepts calls originating from the STRK20 pool",
    },
    {
      num: "02",
      name: "No reentrancy",
      desc: "No step may target the pool or the router itself",
    },
    {
      num: "03",
      name: "Approval reset",
      desc: "Every approval granted mid-execution is reset to zero after use",
    },
    {
      num: "04",
      name: "Zero residue",
      desc: "Every token balance the router touches must end at zero",
    },
    {
      num: "05",
      name: "Minimum output enforced",
      desc: "Slippage and hostile routes are rejected before execution",
    },
    {
      num: "06",
      name: "Bounded calldata",
      desc: "Step count and calldata length are capped to prevent griefing",
    },
    {
      num: "07",
      name: "Protocol allow-list",
      desc: "Only verified Endur, Vesu, and AVNU contracts are callable",
    },
  ];

  const roadmapItems = [
    {
      phase: "NOW",
      desc: "Forge, Reservoir and Prism all receipt-proven on mainnet.",
      status: "active",
    },
    {
      phase: "NEXT",
      desc: "Compound strategies.",
      status: "upcoming",
    },
    {
      phase: "LATER",
      desc: "Additional protocol support. Automated strategy rotation.",
      status: "upcoming",
    },
    {
      phase: "BEYOND",
      desc: "Institutional API access. Cross-chain private yield.",
      status: "future",
    },
  ];

  return (
    <main className="relative min-h-screen bg-[var(--bg)] text-[var(--ink)] antialiased">
      <Nav />

      {/* 3.1 HERO SECTION */}
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <HeroBackground />
        <div className="grid-paper mx-auto grid min-h-[680px] max-w-7xl items-center gap-12 px-6 py-24 lg:grid-cols-[1.15fr_.85fr] lg:py-32">
          {/* Left Column: Hero Text */}
          <motion.div
            initial={fadeIn.initial}
            animate={fadeIn.animate}
            transition={fadeIn.transition}
            className="relative z-10"
          >
            <p className="mono mb-6 text-xs uppercase tracking-[.25em] text-[var(--forest)]">
              Private DeFi yield gateway · Starknet
            </p>
            <h1 className="editorial max-w-3xl text-6xl leading-[.95] tracking-[-.04em] md:text-8xl">
              Your yield is real. <em>Your identity isn&apos;t.</em>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-[var(--muted)]">
              MANTISSA lets a DeFi investor shield capital, route it into real
              yield strategies, and receive new private state after the action.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/yield"
                className="inline-flex items-center justify-center rounded-full bg-[var(--forest)] px-7 py-3.5 text-sm font-medium text-white transition-all duration-200 hover:bg-[#23481f] hover:shadow-[0_4px_20px_rgba(45,90,39,0.25)]"
              >
                Explore strategies
              </Link>
              <Link
                href="/proof"
                className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-white px-7 py-3.5 text-sm font-medium text-[var(--ink)] transition-all duration-200 hover:border-[var(--ink)] hover:bg-[#F5F5F2]"
              >
                See the proof
              </Link>
            </div>
          </motion.div>

          {/* Right Column: Private Positions Card */}
          <motion.div
            initial={fadeIn.initial}
            animate={fadeIn.animate}
            transition={{ ...fadeIn.transition, delay: 0.1 }}
            className="relative z-10 rounded-3xl border border-[var(--border)] bg-white p-6 shadow-[0_20px_70px_rgba(26,26,24,.07)] transition-all duration-200"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <span className="text-sm font-medium">Private positions</span>
              <span className="mono flex items-center gap-1.5 text-xs font-semibold text-[var(--forest)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--forest)] animate-pulse" />
                LIVE / MAINNET
              </span>
            </div>

            {/* 3.4 Strategies with staggered hover glow */}
            <div className="space-y-3 py-6">
              {strategies.map((s, idx) => {
                const isIndigo = s.color === "indigo";
                return (
                  <motion.div
                    key={s.slug}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.35,
                      delay: 0.15 + idx * 0.08,
                      ease: "easeOut" as const,
                    }}
                    className={`group flex items-center justify-between rounded-2xl border border-[var(--border)] p-4 transition-all duration-200 ease-out hover:scale-[1.02] hover:border-opacity-100 ${
                      isIndigo
                        ? "hover:border-[var(--indigo)] hover:shadow-[0_0_24px_rgba(67,56,202,0.22)]"
                        : "hover:border-[var(--forest)] hover:shadow-[0_0_24px_rgba(45,90,39,0.22)]"
                    }`}
                  >
                    <div>
                      <p className="mono text-[10px] uppercase tracking-[.2em] text-[var(--muted)]">
                        {s.eyebrow}
                      </p>
                      <p className="mt-1 font-medium text-[var(--ink)] group-hover:text-black">
                        {s.name}
                      </p>
                    </div>
                    <span
                      className={`mono text-sm font-medium ${
                        isIndigo ? "text-[var(--indigo)]" : "text-[var(--forest)]"
                      }`}
                    >
                      {s.apy}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-5 text-center">
              <div>
                <p className="mono text-xl text-[var(--ink)]">–</p>
                <p className="mt-1 text-xs text-[var(--muted)]">STRK shielded</p>
              </div>
              <div>
                <p className="mono text-xl text-[var(--ink)]">–</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Positions</p>
              </div>
              <div>
                <StatCounter
                  target={evidence.transactions.length}
                  fallbackText="–"
                />
                <p className="mt-1 text-xs text-[var(--muted)]">Tx recorded</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3.2 "WHY THIS EXISTS" SECTION */}
      <section className="relative overflow-hidden border-b border-[var(--border)] py-24 md:py-36">
        <WhyExistsBackground />
        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <motion.div
            initial={scrollFadeIn.initial}
            whileInView={scrollFadeIn.whileInView}
            viewport={scrollFadeIn.viewport}
            transition={scrollFadeIn.transition}
            className="max-w-4xl"
          >
            <p className="mono text-xs uppercase tracking-[.25em] text-[var(--muted)]">
              Problem &amp; Context
            </p>
            <div className="editorial mt-8 text-2xl leading-relaxed text-[var(--ink)] sm:text-3xl md:text-4xl md:leading-snug">
              <p>
                A DeFi investor deposits fifty thousand STRK into a Starknet
                staking protocol. Within minutes, on-chain trackers index the
                transaction. Competitors see the position. Copy-traders follow the
                strategy. The investor&apos;s entire financial approach becomes
                public record.
              </p>
              <p className="mt-8 font-normal text-[var(--forest)]">
                MANTISSA exists because yield and privacy were never supposed to
                be a trade-off.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3.3 "HOW IT WORKS" SECTION */}
      <section className="relative overflow-hidden border-b border-[var(--border)] py-24 md:py-36">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={scrollFadeIn.initial}
            whileInView={scrollFadeIn.whileInView}
            viewport={scrollFadeIn.viewport}
            transition={scrollFadeIn.transition}
            className="mb-16"
          >
            <p className="mono text-xs uppercase tracking-[.25em] text-[var(--forest)]">
              Execution Architecture
            </p>
            <h2 className="editorial mt-4 text-4xl tracking-[-.03em] md:text-6xl">
              How It Works
            </h2>
            <p className="mt-4 max-w-2xl text-base text-[var(--muted)]">
              Four synchronous stages designed to convert public liquidity into
              shielded, yield-generating on-chain positions.
            </p>
          </motion.div>

          {/* Process Cards Grid */}
          <div className="relative">
            {/* Desktop Connector Line */}
            <div
              aria-hidden="true"
              className="absolute left-8 right-8 top-1/2 -z-0 hidden -translate-y-6 lg:block"
            >
              <svg className="h-1 w-full" fill="none">
                <line
                  x1="0"
                  y1="0"
                  x2="100%"
                  y2="0"
                  stroke="#E8E5E0"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                />
              </svg>
            </div>

            <motion.div
              variants={containerStagger}
              initial="initial"
              whileInView="whileInView"
              viewport={{ once: true, amount: 0.2 }}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
            >
              {steps.map((step, idx) => (
                <motion.div
                  key={step.num}
                  variants={childFadeIn}
                  className="group relative z-10 flex flex-col justify-between rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm transition-all duration-200 ease-out hover:scale-[1.02] hover:border-[var(--forest)] hover:shadow-[0_0_24px_rgba(45,90,39,0.18)]"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="mono flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold text-[var(--forest)]">
                        {step.num}
                      </span>
                      <span className="mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                        Step {idx + 1}
                      </span>
                    </div>
                    <h3 className="editorial mt-6 text-2xl font-semibold text-[var(--ink)]">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                      {step.desc}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-[var(--border)]/60">
                    <span className="mono text-[11px] text-[var(--forest)]">
                      Atomic On-Chain
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3.5 "THE THESIS" SECTION */}
      <section className="relative overflow-hidden border-b border-[var(--border)] py-24 md:py-36">
        <ThesisBackground />
        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <motion.div
            initial={scrollFadeIn.initial}
            whileInView={scrollFadeIn.whileInView}
            viewport={scrollFadeIn.viewport}
            transition={scrollFadeIn.transition}
            className="max-w-4xl"
          >
            <p className="mono text-xs uppercase tracking-[.25em] text-[var(--muted)]">
              The Thesis
            </p>
            <h2 className="editorial mt-6 text-4xl leading-tight tracking-[-.03em] md:text-6xl md:leading-[1.15]">
              Privacy is not the category. It is the property that makes every
              category work better.
            </h2>
          </motion.div>
        </div>
      </section>

      {/* 3.6 "INTEGRATION DEPTH" SECTION */}
      <section className="relative border-b border-[var(--border)] py-24 md:py-36">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={scrollFadeIn.initial}
            whileInView={scrollFadeIn.whileInView}
            viewport={scrollFadeIn.viewport}
            transition={scrollFadeIn.transition}
            className="mb-16"
          >
            <p className="mono text-xs uppercase tracking-[.25em] text-[var(--indigo)]">
              STRK20 Primitives
            </p>
            <h2 className="editorial mt-4 text-4xl tracking-[-.03em] md:text-6xl">
              Integration Depth
            </h2>
            <p className="mt-4 max-w-2xl text-base text-[var(--muted)]">
              Architected specifically for the Starknet private execution model
              and the official STRK20 standard.
            </p>
          </motion.div>

          <motion.div
            variants={containerStagger}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true, amount: 0.15 }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {integrationCards.map((card) => {
              const { Icon, title, desc, accent } = card;
              const isIndigo = accent === "indigo";
              return (
                <motion.div
                  key={title}
                  variants={childFadeIn}
                  className={`group rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm transition-all duration-200 ease-out hover:scale-[1.02] ${
                    isIndigo
                      ? "hover:border-[var(--indigo)] hover:shadow-[0_0_24px_rgba(67,56,202,0.2)]"
                      : "hover:border-[var(--forest)] hover:shadow-[0_0_24px_rgba(45,90,39,0.2)]"
                  }`}
                >
                  <div
                    className={`inline-flex rounded-2xl p-3 ${
                      isIndigo ? "bg-[#EEF2FF]" : "bg-[#E8F0E6]"
                    }`}
                  >
                    <Icon
                      size={36}
                      className={
                        isIndigo
                          ? "text-[var(--indigo)]"
                          : "text-[var(--forest)]"
                      }
                    />
                  </div>
                  <h3 className="editorial mt-5 text-2xl font-medium text-[var(--ink)]">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                    {desc}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* 3.7 "SECURITY INVARIANTS" SECTION */}
      <section className="relative bg-[#1A1A18] py-24 text-[#FAFAF8] md:py-36">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={scrollFadeIn.initial}
            whileInView={scrollFadeIn.whileInView}
            viewport={scrollFadeIn.viewport}
            transition={scrollFadeIn.transition}
            className="mb-16"
          >
            <p className="mono text-xs uppercase tracking-[.25em] text-[#86efac]">
              Deterministic Protocol Guarantees
            </p>
            <h2 className="editorial mt-4 text-4xl tracking-[-.03em] text-[#FAFAF8] md:text-6xl">
              Security Invariants
            </h2>
            <p className="mt-4 max-w-2xl text-base text-[#A1A19A]">
              The MantissaRouter strictly enforces these invariants on-chain for
              every route execution.
            </p>
          </motion.div>

          <motion.div
            variants={containerStagger}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true, amount: 0.15 }}
            className="divide-y divide-[#2D2D2A] rounded-3xl border border-[#2D2D2A] bg-[#222220]/60 backdrop-blur-sm"
          >
            {invariants.map((inv) => (
              <motion.div
                key={inv.num}
                variants={childFadeIn}
                className="grid gap-2 px-6 py-5 sm:grid-cols-[60px_240px_1fr] sm:items-center sm:gap-6 md:px-8"
              >
                <span className="mono text-sm font-semibold text-[#86efac]">
                  {inv.num}
                </span>
                <span className="mono text-sm font-medium text-[#FAFAF8]">
                  {inv.name}
                </span>
                <span className="text-sm leading-relaxed text-[#A1A19A]">
                  {inv.desc}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 3.8 "ROADMAP" SECTION */}
      <section className="relative border-b border-[var(--border)] py-24 md:py-36">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={scrollFadeIn.initial}
            whileInView={scrollFadeIn.whileInView}
            viewport={scrollFadeIn.viewport}
            transition={scrollFadeIn.transition}
            className="mb-16"
          >
            <p className="mono text-xs uppercase tracking-[.25em] text-[var(--forest)]">
              Execution Timeline
            </p>
            <h2 className="editorial mt-4 text-4xl tracking-[-.03em] md:text-6xl">
              Roadmap
            </h2>
          </motion.div>

          <motion.div
            variants={containerStagger}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true, amount: 0.15 }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {roadmapItems.map((item) => {
              const isActive = item.status === "active";
              return (
                <motion.div
                  key={item.phase}
                  variants={childFadeIn}
                  className={`rounded-3xl border p-6 transition-all duration-200 ease-out hover:scale-[1.02] ${
                    isActive
                      ? "border-[var(--forest)] bg-[#E8F0E6]/50 shadow-[0_0_20px_rgba(45,90,39,0.15)]"
                      : "border-[var(--border)] bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="mono text-sm font-bold tracking-widest text-[var(--forest)]">
                      {item.phase}
                    </span>
                    {isActive && (
                      <span className="mono inline-flex items-center gap-1 rounded-full bg-[var(--forest)] px-2.5 py-0.5 text-[10px] font-medium text-white">
                        LIVE
                      </span>
                    )}
                  </div>
                  <p className="mt-6 text-sm leading-relaxed text-[var(--muted)]">
                    {item.desc}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* 3.9 FINAL CTA SECTION */}
      <section className="relative overflow-hidden py-24 md:py-36">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <motion.div
            initial={scrollFadeIn.initial}
            whileInView={scrollFadeIn.whileInView}
            viewport={scrollFadeIn.viewport}
            transition={scrollFadeIn.transition}
            className="mx-auto max-w-3xl"
          >
            <p className="mono text-xs uppercase tracking-[.25em] text-[var(--forest)]">
              Private Starknet DeFi
            </p>
            <h2 className="editorial mt-6 text-5xl leading-tight tracking-[-.03em] md:text-7xl">
              Your yield is real. <br className="hidden sm:inline" />
              <em>Your identity stays yours.</em>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--muted)]">
              Shield capital, route into verified Endur, Vesu, and AVNU
              strategies, and verify cryptographic evidence on-chain.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/yield"
                className="inline-flex items-center justify-center rounded-full bg-[var(--forest)] px-8 py-3.5 text-sm font-medium text-white transition-all duration-200 hover:bg-[#23481f] hover:shadow-[0_4px_20px_rgba(45,90,39,0.25)]"
              >
                Explore strategies
              </Link>
              <Link
                href="/private"
                className="inline-flex items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] px-8 py-3.5 text-sm font-medium text-white transition-all duration-200 hover:bg-black"
              >
                Launch private action
              </Link>
              <Link
                href="/proof"
                className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-white px-8 py-3.5 text-sm font-medium text-[var(--ink)] transition-all duration-200 hover:border-[var(--ink)] hover:bg-[#F5F5F2]"
              >
                Evidence room
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[var(--border)] bg-white py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="editorial grid h-7 w-7 place-items-center rounded-full border border-[var(--ink)] text-sm">
              M
            </span>
            <span className="text-xs font-semibold tracking-[.2em]">
              MANTISSA
            </span>
            <span className="text-xs text-[var(--muted)]">· Starknet Mainnet</span>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs text-[var(--muted)]">
            <Link href="/yield" className="hover:text-[var(--ink)]">
              Strategies
            </Link>
            <Link href="/private" className="hover:text-[var(--ink)]">
              Private Actions
            </Link>
            <Link href="/proof" className="hover:text-[var(--ink)]">
              Proof
            </Link>
            <Link href="/compliance" className="hover:text-[var(--ink)]">
              Compliance
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

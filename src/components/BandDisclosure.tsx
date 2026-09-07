"use client";
import { useEffect, useState } from "react";
import { measurePoolBand, type BandReport } from "@/lib/poolTraffic";
import type { PoolLegName } from "@/lib/poolTrafficCore";

export default function BandDisclosure({
  token,
  amountRaw,
  direction,
  actionPhrase,
}: {
  token: string;
  amountRaw: bigint | null;
  direction: PoolLegName;
  actionPhrase: string;
}) {
  const [report, setReport] = useState<BandReport | null>(null);

  useEffect(() => {
    let alive = true;
    if (!token || !amountRaw || amountRaw <= 0n) {
      setReport(null);
      return;
    }
    const timer = setTimeout(() => {
      measurePoolBand(token, amountRaw)
        .then((next) => {
          if (alive) setReport(next);
        })
        .catch(() => {
          if (alive)
            setReport({ status: "unavailable", reason: "query failed" });
        });
    }, 500);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [token, amountRaw, direction]);

  if (!token || !amountRaw || amountRaw <= 0n) return null;

  if (!report || report.status === "unavailable") {
    const why = report && report.status === "unavailable" ? report.reason : "…";
    return (
      <p className="mono text-[11px] leading-5 text-[var(--muted)]">
        Live privacy disclosure unavailable ({why}). Treat this action as
        potentially identifiable by its amount alone.
      </p>
    );
  }

  const count = report.peers[direction];
  const prefix = report.partial ? "at least " : "";
  if (count === 0) {
    return (
      <p className="mono text-[11px] leading-5 text-[var(--ink)]">
        <span className="text-[var(--amber, #b45309)]">Band thin: </span>
        {prefix}0 other {actionPhrase} in your rough size band (
        {report.bandLabel}) over the last ~{report.windowBlocks} blocks — this
        action would currently be identifiable by its amount alone.
      </p>
    );
  }
  return (
    <p className="mono text-[11px] leading-5 text-[var(--forest)]">
      Band: {prefix}
      {count} other {actionPhrase} in your rough size band ({report.bandLabel})
      over the last ~{report.windowBlocks} blocks.
    </p>
  );
}

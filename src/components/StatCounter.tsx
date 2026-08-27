"use client";

import React, { useEffect, useState } from "react";

interface StatCounterProps {
  target: number;
  durationMs?: number;
  fallbackText?: string;
}

export default function StatCounter({
  target,
  durationMs = 800,
  fallbackText = "–",
}: StatCounterProps) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (typeof target !== "number" || isNaN(target)) return;
    const start = performance.now();
    const frame = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.round(ease * target));
      if (progress < 1) {
        requestAnimationFrame(frame);
      }
    };
    const req = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(req);
  }, [target, durationMs]);

  if (count === null) {
    return <span className="mono text-xl">{fallbackText}</span>;
  }

  return <span className="mono text-xl">{count}</span>;
}

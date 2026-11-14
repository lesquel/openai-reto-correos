"use client";

import { useMemo } from "react";

const COLORS = ["#10a37f", "#7c5cff", "#ffffff", "#ffd166", "#4cc9f0"];

export function Confetti({ count = 120 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 2.2 + Math.random() * 2,
        dx: `${(Math.random() - 0.5) * 300}px`,
        rot: `${Math.random() * 1080}deg`,
        color: COLORS[i % COLORS.length],
      })),
    [count],
  );
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <i
          key={i}
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ["--dx" as string]: p.dx,
            ["--rot" as string]: p.rot,
          }}
        />
      ))}
    </div>
  );
}

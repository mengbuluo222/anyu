"use client";

import { useEffect, useState } from "react";
import { TODAY_LINES, lineOfDay } from "@/lib/lines";

const ROTATE_MS = 16000;

export default function TodayLine() {
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // 先对齐到「今日一句」，再缓慢轮播
    const today = lineOfDay();
    const start = Math.max(0, TODAY_LINES.indexOf(today));
    setIndex(start);
    setReady(true);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % TODAY_LINES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="today-line" aria-live="polite">
      <span className="today-tag">今日一句</span>
      <p key={index} style={{ opacity: ready ? undefined : 0 }}>
        {TODAY_LINES[index]}
      </p>
    </div>
  );
}

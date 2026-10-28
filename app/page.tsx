"use client";

import Link from "next/link";
import { useEffect } from "react";
import { track } from "@/lib/track";
import TodayLine from "@/components/TodayLine";

export default function HomePage() {
  useEffect(() => {
    track("page_view", "home");
  }, []);

  return (
    <main className="page">
      <section className="hero">
        <h1>
          不必变好，
          <br />
          在这里可以只是疲惫。
        </h1>

        <div className="lines">
          <p>这里没有开导，</p>
          <p>没有解决方案，</p>
          <p>没有「想开一点」。</p>
          <p style={{ marginTop: 16 }}>
            你可以随便碎碎念、发呆、放一段白噪音。
          </p>
        </div>

        <TodayLine />

        <div className="entries">
          <Link
            className="pill"
            href="/chat"
            onClick={() => track("enter_hole")}
          >
            🪵 进入树洞
          </Link>
          <Link
            className="pill pill--ghost"
            href="/silent"
            onClick={() => track("open_noise")}
          >
            🌫 静默陪伴
          </Link>
        </div>

        <p className="hint">
          游客直接使用，不用注册，不留手机号 · 记录只留在你自己的浏览器里
        </p>
      </section>
    </main>
  );
}

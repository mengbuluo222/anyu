"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function TopBar() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("anyu.theme", next);
    } catch {
      /* 忽略隐私模式下的写入失败 */
    }
  }

  return (
    <header className="topbar">
      <Link className="brand" href="/">
        安隅<span>情绪树洞</span>
      </Link>
      <nav className="nav">
        <Link href="/chat">树洞</Link>
        <Link href="/silent">静默</Link>
        <Link href="/settings">设置</Link>
        <button
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "切换到浅色" : "切换到深色"}
          title={theme === "dark" ? "切换到浅色" : "切换到深色"}
        >
          {theme === "dark" ? "浅色" : "深色"}
        </button>
      </nav>
    </header>
  );
}

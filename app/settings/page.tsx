"use client";

import { useEffect, useState } from "react";
import { clearAll, isPersist, setPersist } from "@/lib/storage";
import { track } from "@/lib/track";

export default function SettingsPage() {
  const [persist, setPersistState] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    track("page_view", "settings");
    setPersistState(isPersist());
    const t = document.documentElement.getAttribute("data-theme");
    setTheme(t === "dark" ? "dark" : "light");
  }, []);

  function showToast(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(null), 1800);
  }

  function onPersist(on: boolean) {
    setPersist(on);
    setPersistState(on);
    showToast(on ? "已开启：记录留在本机，下次还在" : "已关闭：关掉页面就清空");
  }

  function onTheme(next: "light" | "dark") {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("anyu.theme", next);
    } catch {
      /* ignore */
    }
  }

  function onClearAll() {
    if (!window.confirm("清空本机所有记录？清掉就找不回来了。")) return;
    clearAll();
    showToast("都清空了");
  }

  return (
    <main className="page">
      <div className="settings">
        <h2 className="section-title">设置</h2>

        <div className="setting-row">
          <div>
            <div className="setting-label">本地记忆</div>
            <div className="setting-desc">
              开启后，对话存在你这台设备的浏览器里，下次还能看见。只在本机，不上云。
            </div>
          </div>
          <div className="seg">
            <button
              className={persist ? "on" : ""}
              onClick={() => onPersist(true)}
            >
              记住
            </button>
            <button
              className={!persist ? "on" : ""}
              onClick={() => onPersist(false)}
            >
              关掉即清
            </button>
          </div>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">主题</div>
            <div className="setting-desc">浅色像白天，深色像关灯以后。</div>
          </div>
          <div className="seg">
            <button className={theme === "light" ? "on" : ""} onClick={() => onTheme("light")}>
              浅色
            </button>
            <button className={theme === "dark" ? "on" : ""} onClick={() => onTheme("dark")}>
              深色
            </button>
          </div>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">清空全部记忆</div>
            <div className="setting-desc">
              包括对话记录和情绪打卡，只清这台设备上的。
            </div>
          </div>
          <button className="btn-soft btn-danger" onClick={onClearAll}>
            清空
          </button>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">订阅</div>
            <div className="setting-desc">暂无。等这里真的有用，再说。</div>
          </div>
          <button className="btn-soft" disabled style={{ opacity: 0.4, cursor: "not-allowed" }}>
            未开放
          </button>
        </div>

        <div className="divider" />

        <h2 className="section-title">免责说明</h2>
        <p className="muted">
          安隅只是 AI 文字陪伴工具，不属于心理诊疗服务，不能替代心理咨询师、精神科医生。
        </p>
        <p className="muted">
          如果你持续重度低落，或出现伤害自己的想法，请立刻联系心理危机干预热线
          （全国 24 小时：<a href="tel:12356" style={{ textDecoration: "underline" }}>12356</a>）
          或前往医院就诊。
        </p>
        <p className="muted">
          我们不收集你的手机号，不需要注册。你写的内容只留在本机，不会被放进任何统计里；
          我们只知道「今天有多少人进来、点了哪个入口」这类匿名的次数，看不到一个字。
        </p>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

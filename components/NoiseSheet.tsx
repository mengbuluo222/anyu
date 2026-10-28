"use client";

import { useEffect, useState } from "react";
import { getNoiseEngine, NOISES, type NoiseId } from "@/lib/noise";
import { track } from "@/lib/track";

export default function NoiseSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState<NoiseId | null>(null);
  const [volume, setVolume] = useState(0.5);

  useEffect(() => {
    return () => {
      // 关闭面板不停止播放，页面卸载时也不强制停（引擎为单例，切换页面由各页控制）
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const engine = getNoiseEngine();
    setCurrent(engine.current);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function choose(id: NoiseId) {
    const engine = getNoiseEngine();
    if (engine.current === id) {
      engine.stop();
      setCurrent(null);
      return;
    }
    engine.play(id);
    setCurrent(id);
    track("open_noise", id);
  }

  return (
    <div className="noise-panel" onClick={onClose}>
      <div className="noise-sheet" onClick={(e) => e.stopPropagation()}>
        <h3>白噪音</h3>
        <p className="muted" style={{ margin: 0 }}>
          放一段声音，不说话也没关系
        </p>

        <div className="noise-list">
          {NOISES.map((n) => (
            <button
              key={n.id}
              className={`noise-item${current === n.id ? " active" : ""}`}
              onClick={() => choose(n.id)}
            >
              <span>
                <span className="n-name">{n.name}</span>
                <div className="n-desc">{n.desc}</div>
              </span>
              <span className="n-dot" />
            </button>
          ))}
        </div>

        <div className="volume-row" style={{ marginBottom: 14 }}>
          <span>音量</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolume(v);
              getNoiseEngine().setVolume(v);
            }}
          />
        </div>

        <button className="sheet-close" onClick={onClose}>
          关上
        </button>
      </div>
    </div>
  );
}

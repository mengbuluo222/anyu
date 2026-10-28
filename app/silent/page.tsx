"use client";

import { useEffect, useState } from "react";
import { getNoiseEngine, NOISES, type NoiseId } from "@/lib/noise";
import { loadCheckin, saveCheckin } from "@/lib/storage";
import { track } from "@/lib/track";

const MOODS = ["疲惫", "烦躁", "无力", "委屈", "茫然"];

export default function SilentPage() {
  const [noise, setNoise] = useState<NoiseId>("rain");
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [mood, setMood] = useState<string | null>(null);

  useEffect(() => {
    track("page_view", "silent");
    const c = loadCheckin();
    if (c) setMood(c.mood);
    return () => {
      // 离开页面就停掉声音，不偷偷占用
      getNoiseEngine().stop();
    };
  }, []);

  function toggle() {
    const engine = getNoiseEngine();
    if (playing) {
      engine.stop();
      setPlaying(false);
    } else {
      engine.setVolume(volume);
      engine.play(noise);
      setPlaying(true);
      track("open_noise", noise);
    }
  }

  function pick(id: NoiseId) {
    setNoise(id);
    if (playing) {
      getNoiseEngine().play(id);
    }
  }

  function pickMood(m: string) {
    setMood(m);
    saveCheckin(m);
    track("checkin", m);
  }

  const now = NOISES.find((n) => n.id === noise)!;

  return (
    <main className="page">
      <div className="silent">
        <h2 className="section-title">今天的感觉</h2>
        <div className="mood-grid">
          {MOODS.map((m) => (
            <button
              key={m}
              className={`mood-chip${mood === m ? " active" : ""}`}
              onClick={() => pickMood(m)}
            >
              {m}
            </button>
          ))}
        </div>
        <p className="mood-note">
          只做个标记，不分析。点一下就走，也可以。
        </p>

        <h2 className="section-title">白噪音</h2>
        <div className="player-card">
          <p className="player-now">{now.name}</p>
          <p className="player-desc">{now.desc}</p>

          <div className="player-controls">
            <button
              className="play-toggle"
              onClick={toggle}
              aria-label={playing ? "暂停" : "播放"}
            >
              {playing ? "▮▮" : "▶"}
            </button>
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
        </div>

        <div className="noise-list" style={{ marginTop: 14 }}>
          {NOISES.map((n) => (
            <button
              key={n.id}
              className={`noise-item${noise === n.id ? " active" : ""}`}
              onClick={() => pick(n.id)}
            >
              <span>
                <span className="n-name">{n.name}</span>
                <div className="n-desc">{n.desc}</div>
              </span>
              <span className="n-dot" />
            </button>
          ))}
        </div>

        <p className="muted" style={{ marginTop: 6 }}>
          没有要聊的也没关系。把手机放着，让它响着就行。
        </p>
      </div>
    </main>
  );
}

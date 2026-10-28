"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import NoiseSheet from "@/components/NoiseSheet";
import {
  clearMessages,
  exportTranscript,
  loadMessages,
  saveMessages,
  type Msg,
} from "@/lib/storage";
import { track } from "@/lib/track";

type SongItem = { num: string; name: string; artist: string };

function MusicPlayer({ songs }: { songs: SongItem[] }) {
  const [playing, setPlaying] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  const demoUrls: Record<string, string> = {
    月光落在杯底:
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    窗外的雨: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    深夜的钢琴: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    风吹过树叶: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    慢慢来: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
  };

  function playSong(index: number) {
    const song = songs[index];
    if (!song) return;

    if (playing === index) {
      audioRef.current?.pause();
      setPlaying(null);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    audioRef.current?.pause();

    const url = demoUrls[song.name] || demoUrls["月光落在杯底"];
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.addEventListener("timeupdate", () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    });

    audio.addEventListener("ended", () => {
      setPlaying(null);
      setProgress(0);
      if (timerRef.current) clearInterval(timerRef.current);
    });

    audio.play().catch(() => {});
    setPlaying(index);
    setProgress(0);
  }

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="music-recommend">
      <div className="music-recommend-title">为你推荐</div>
      {songs.map((s, i) => (
        <div
          key={s.num}
          className={`music-song-item ${playing === i ? "music-song-item--active" : ""}`}
        >
          <button
            className="music-play-btn"
            onClick={() => playSong(i)}
            aria-label={playing === i ? "暂停" : "播放"}
          >
            {playing === i ? (
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="currentColor"
              >
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <span className="music-song-num">{s.num}.</span>
          <span className="music-song-name">{s.name}</span>
          <span className="music-song-artist">{s.artist}</span>
          {playing === i && (
            <div className="music-progress-bar">
              <div
                className="music-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [noiseOpen, setNoiseOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [contextInfo, setContextInfo] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const contextTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setMessages(loadMessages());
    track("page_view", "chat");
    return () => {
      abortRef.current?.abort();
      if (contextTimerRef.current) clearTimeout(contextTimerRef.current);
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = viewportRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, busy, scrollToBottom]);

  function showToast(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(null), 1800);
  }

  function showContext(text: string) {
    setContextInfo(text);
    if (contextTimerRef.current) clearTimeout(contextTimerRef.current);
    contextTimerRef.current = window.setTimeout(
      () => setContextInfo(null),
      3000,
    );
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;

    const wantsMusic =
      /听歌|音乐|放首歌|推荐.*歌|来点.*音乐|随便.*歌|都行.*歌|想听/i.test(text);

    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    saveMessages(next);
    setInput("");
    setBusy(true);

    setMessages([...next, { role: "assistant", content: "" }]);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, wantsMusic }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        const fallback = "我在。刚才没接上，再说一句也可以。";
        setMessages([...next, { role: "assistant", content: fallback }]);
        saveMessages([...next, { role: "assistant", content: fallback }]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const snapshot = acc;
        setMessages([...next, { role: "assistant", content: snapshot }]);
      }

      const finalMsgs: Msg[] = [
        ...next,
        { role: "assistant", content: acc.trim() || "我在。" },
      ];
      setMessages(finalMsgs);
      saveMessages(finalMsgs);
    } catch {
      // 用户切换页面或网络中断
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  }

  function onClear() {
    if (!window.confirm("清空这次聊的内容？清掉就找不回来了。")) return;
    clearMessages();
    setMessages([]);
    showToast("已经清空了");
  }

  function renderAssistantContent(content: string) {
    const musicMatch = content.match(/【推荐歌曲】\n([\s\S]*)/);
    if (!musicMatch) return content;

    const mainText = content.replace(/【推荐歌曲】\n[\s\S]*/, "").trim();
    const songsText = musicMatch[1].trim();
    const songs = songsText
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const match = line.match(/^(\d+)\.\s+(.+?)\s*-\s*(.+)$/);
        if (match) {
          return { num: match[1], name: match[2], artist: match[3] };
        }
        return null;
      })
      .filter(Boolean) as Array<{ num: string; name: string; artist: string }>;

    return (
      <>
        {mainText && <span>{mainText}</span>}
        {songs.length > 0 && <MusicPlayer songs={songs} />}
      </>
    );
  }

  return (
    <main className="page chat">
      <div className="chat-viewport" ref={viewportRef}>
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>这里不用打招呼。</p>
            <p>想说什么都可以，不用整理语言。</p>
            <p>发一个标点、一句骂人的话，也算数。</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`msg ${m.role === "user" ? "msg--user" : "msg--assistant"}`}
          >
            <div className="msg-bubble">
              {m.role === "assistant" && m.content === "" ? (
                <span className="typing">
                  <i />
                  <i />
                  <i />
                </span>
              ) : m.role === "assistant" ? (
                renderAssistantContent(m.content)
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
      </div>

      {contextInfo && <div className="context-toast">{contextInfo}</div>}

      <div className="composer">
        <div className="composer-box">
          <textarea
            ref={taRef}
            value={input}
            placeholder="想说什么都可以，不用整理语言"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
          />
          <div className="composer-actions">
            <div className="composer-tools">
              <button
                className="tool-btn"
                onClick={() => setNoiseOpen(true)}
                title="放一段声音"
              >
                白噪音
              </button>
              <button className="tool-btn" onClick={onClear}>
                清空本次记忆
              </button>
              <button
                className="tool-btn"
                onClick={() => exportTranscript(messages)}
                disabled={messages.length === 0}
                title="导出本次记录"
              >
                导出记录
              </button>
            </div>
            <button
              className="send-btn"
              onClick={() => void send()}
              disabled={busy || !input.trim()}
              aria-label="发送"
            >
              {busy ? "…" : "说"}
            </button>
          </div>
        </div>
      </div>

      <NoiseSheet open={noiseOpen} onClose={() => setNoiseOpen(false)} />
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

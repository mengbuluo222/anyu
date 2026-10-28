/**
 * 极轻量埋点，双通道：
 * 1. 本地累计事件次数（给界面自己看 / 调试用）
 * 2. 上报匿名事件：Vercel Analytics + /api/track（Upstash 计数）
 * 只发事件名与白名单枚举值，绝不带任何输入内容。
 * 事件白名单：page_view / enter_hole / open_noise / checkin
 */
import { track as vercelTrack } from "@vercel/analytics";

type EventName = "page_view" | "enter_hole" | "open_noise" | "checkin";

const KEY = "anyu.stats";
const VID = "anyu.vid";

function keyOf(event: EventName, extra?: string) {
  return extra ? `${event}:${extra}` : event;
}

/** 本地随机 ID，仅用于按天去重人数；不读取任何设备/浏览器特征 */
function visitorId(): string {
  try {
    let id = window.localStorage.getItem(VID);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36);
      window.localStorage.setItem(VID, id);
    }
    return id;
  } catch {
    return "";
  }
}

/** 关页时也要发得出去，优先 sendBeacon */
function report(payload: string) {
  try {
    if (navigator.sendBeacon?.("/api/track", new Blob([payload], { type: "application/json" }))) {
      return;
    }
  } catch {
    /* 落到 fetch */
  }
  try {
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    });
  } catch {
    /* 统计失败不影响使用 */
  }
}

export function track(event: EventName, extra?: string) {
  if (typeof window === "undefined") return;

  const key = keyOf(event, extra);

  try {
    const raw = window.localStorage.getItem(KEY);
    const stats = raw ? JSON.parse(raw) : {};
    stats[key] = (stats[key] || 0) + 1;
    window.localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    /* ignore */
  }

  // Vercel Analytics 自带 pageview，不重复记
  if (event !== "page_view") {
    try {
      vercelTrack(event, extra ? { type: extra } : undefined);
    } catch {
      /* ignore */
    }
  }

  // 自建 Upstash 计数：pageview 也要，因为那是你自己的一份底账
  report(JSON.stringify({ event, type: extra, vid: visitorId() }));
}

export function readStats(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

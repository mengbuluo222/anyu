export type Msg = { role: "user" | "assistant"; content: string };

const KEY_MSGS = "anyu.messages";
const KEY_PERSIST = "anyu.persist";
const KEY_CHECKIN = "anyu.checkin";

/**
 * 记忆策略：
 * - 默认 sessionStorage：关闭页面即清除（游客临时记忆）
 * - 用户主动开启「本地持久记忆」后改用 localStorage（仍只在本机，不上云）
 */
function store(): Storage | null {
  if (typeof window === "undefined") return null;
  return isPersist() ? window.localStorage : window.sessionStorage;
}

export function isPersist(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY_PERSIST) === "1";
  } catch {
    return false;
  }
}

export function setPersist(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY_PERSIST, on ? "1" : "0");
  } catch {
    /* ignore */
  }
  // 切换时把当前内容迁移到目标存储
  const msgs = loadMessages();
  clearMessages();
  if (msgs.length) saveMessages(msgs);
}

export function loadMessages(): Msg[] {
  const s = store();
  if (!s) return [];
  try {
    const raw = s.getItem(KEY_MSGS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is Msg =>
        !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
    );
  } catch {
    return [];
  }
}

export function saveMessages(msgs: Msg[]) {
  const s = store();
  if (!s) return;
  try {
    // 只保留最近 60 条，避免无限增长
    s.setItem(KEY_MSGS, JSON.stringify(msgs.slice(-60)));
  } catch {
    /* ignore */
  }
}

export function clearMessages() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY_MSGS);
    window.localStorage.removeItem(KEY_MSGS);
  } catch {
    /* ignore */
  }
}

export function clearAll() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY_MSGS);
    window.localStorage.removeItem(KEY_MSGS);
    window.localStorage.removeItem(KEY_CHECKIN);
  } catch {
    /* ignore */
  }
}

export function saveCheckin(mood: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      KEY_CHECKIN,
      JSON.stringify({ mood, at: Date.now() })
    );
  } catch {
    /* ignore */
  }
}

export function loadCheckin(): { mood: string; at: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY_CHECKIN);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || typeof v.mood !== "string") return null;
    return v;
  } catch {
    return null;
  }
}

export function exportTranscript(msgs: Msg[]) {
  const lines = msgs.map((m) =>
    `${m.role === "user" ? "我" : "安隅"}：${m.content}`
  );
  const text = `安隅 · 本次记录\n${new Date().toLocaleString("zh-CN")}\n\n${lines.join("\n\n")}`;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "安隅-对话记录.txt";
  a.click();
  URL.revokeObjectURL(url);
}

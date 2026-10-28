/**
 * 长期记忆模块
 * 在本地存储用户的历史对话摘要和模式
 * 不上云，只在本机
 */

import type { Msg } from "./storage";

const KEY_LONG_MEMORY = "anyu.long_memory";
const KEY_SESSION_COUNT = "anyu.session_count";

export type UserMemory = {
  totalSessions: number; // 总会话数
  totalMessages: number; // 总消息数
  lastVisit: number; // 上次访问时间戳
  commonTopics: string[]; // 常见话题关键词
  emotionPatterns: Record<string, number>; // 情绪模式统计
  lastSummary: string; // 上次对话摘要
  preferences: {
    avgMessageLength: number; // 平均消息长度
    prefersShort: boolean; // 是否偏好短消息
    commonTimeOfDay: string; // 常用时间段
  };
};

const DEFAULT_MEMORY: UserMemory = {
  totalSessions: 0,
  totalMessages: 0,
  lastVisit: 0,
  commonTopics: [],
  emotionPatterns: {},
  lastSummary: "",
  preferences: {
    avgMessageLength: 0,
    prefersShort: false,
    commonTimeOfDay: "",
  },
};

function getStore(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadMemory(): UserMemory {
  const store = getStore();
  if (!store) return DEFAULT_MEMORY;

  try {
    const raw = store.getItem(KEY_LONG_MEMORY);
    if (!raw) return DEFAULT_MEMORY;
    return { ...DEFAULT_MEMORY, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_MEMORY;
  }
}

export function saveMemory(memory: Partial<UserMemory>) {
  const store = getStore();
  if (!store) return;

  try {
    const current = loadMemory();
    const updated = { ...current, ...memory };
    store.setItem(KEY_LONG_MEMORY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function recordSession(messages: Msg[]) {
  const memory = loadMemory();

  const userMessages = messages.filter((m) => m.role === "user");
  const topics = extractTopics(userMessages);
  const avgLength =
    userMessages.reduce((sum, m) => sum + m.content.length, 0) /
    (userMessages.length || 1);

  saveMemory({
    totalSessions: memory.totalSessions + 1,
    totalMessages: memory.totalMessages + messages.length,
    lastVisit: Date.now(),
    commonTopics: mergeTopics(memory.commonTopics, topics),
    preferences: {
      ...memory.preferences,
      avgMessageLength: avgLength,
      prefersShort: avgLength < 20,
    },
  });
}

function extractTopics(messages: Msg[]): string[] {
  const stopWords = new Set([
    "的",
    "了",
    "在",
    "是",
    "我",
    "有",
    "和",
    "就",
    "不",
    "人",
    "都",
    "一",
    "一个",
    "上",
    "也",
    "很",
    "到",
    "说",
    "要",
    "去",
    "你",
    "会",
    "着",
    "没有",
    "看",
    "好",
    "自己",
    "这",
    "那",
    "吗",
    "吧",
    "呢",
    "啊",
    "哦",
    "嗯",
    "吧",
    "什么",
    "怎么",
    "为什么",
    "谁",
    "哪",
    "哪里",
    "哪里",
    "几",
    "什么时候",
  ]);

  const keywords: Record<string, number> = {};

  for (const msg of messages) {
    const words = msg.content.split(/[\s,，.。!！?？;；:：\n]+/);
    for (const word of words) {
      const clean = word.trim();
      if (clean.length > 1 && !stopWords.has(clean)) {
        keywords[clean] = (keywords[clean] || 0) + 1;
      }
    }
  }

  return Object.entries(keywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

function mergeTopics(existing: string[], newTopics: string[]): string[] {
  const combined = [...existing, ...newTopics];
  const unique = [...new Set(combined)];
  return unique.slice(0, 10);
}

export function generateMemoryContext(memory: UserMemory): string {
  if (memory.totalSessions === 0) {
    return "\n【对话历史】这是第一次对话。";
  }

  const daysSinceLastVisit = memory.lastVisit
    ? Math.floor((Date.now() - memory.lastVisit) / (1000 * 60 * 60 * 24))
    : 0;

  let context = `\n【对话历史】\n`;
  context += `- 这是第 ${memory.totalSessions + 1} 次对话`;

  if (daysSinceLastVisit === 0) {
    context += "，今天已经来过";
  } else if (daysSinceLastVisit === 1) {
    context += "，昨天来过";
  } else if (daysSinceLastVisit < 7) {
    context += `，${daysSinceLastVisit} 天前来过`;
  } else if (daysSinceLastVisit < 30) {
    context += `，上次是 ${daysSinceLastVisit} 天前`;
  } else {
    context += "，很久没来了";
  }
  context += "\n";

  if (memory.commonTopics.length > 0) {
    context += `- 之前聊过的话题：${memory.commonTopics.slice(0, 3).join("、")}\n`;
  }

  if (memory.preferences.prefersShort) {
    context += "- 对方通常说话比较简短\n";
  }

  if (memory.lastSummary) {
    context += `- 上次对话摘要：${memory.lastSummary}\n`;
  }

  return context;
}

export function summarizeConversation(messages: Msg[]): string {
  const userMessages = messages.filter((m) => m.role === "user");
  if (userMessages.length === 0) return "";

  const topics = extractTopics(userMessages);
  if (topics.length === 0) return "";

  return `主要聊了：${topics.slice(0, 3).join("、")}`;
}

export function incrementSessionCount() {
  const store = getStore();
  if (!store) return;

  try {
    const current = parseInt(store.getItem(KEY_SESSION_COUNT) || "0", 10);
    store.setItem(KEY_SESSION_COUNT, String(current + 1));
  } catch {
    // ignore
  }
}

export function getSessionCount(): number {
  const store = getStore();
  if (!store) return 0;

  try {
    return parseInt(store.getItem(KEY_SESSION_COUNT) || "0", 10);
  } catch {
    return 0;
  }
}

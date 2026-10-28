import { SYSTEM_PROMPT, MAX_TURNS } from "@/lib/prompt";
import { analyzeEmotion, getEmotionGuidance } from "@/lib/emotion";
import {
  loadMemory,
  generateMemoryContext,
  summarizeConversation,
} from "@/lib/longterm-memory";
import { recommendSongs, formatMusicResponse } from "@/lib/music";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InMsg = { role: "user" | "assistant"; content: string };

const BASE = process.env.AI_BASE_URL || "https://api.deepseek.com/v1";
const KEY = process.env.AI_API_KEY || "";
const MODEL = process.env.AI_MODEL || "deepseek-chat";

function sanitize(list: unknown): InMsg[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter(
      (m): m is InMsg =>
        !!m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    )
    .map((m) => ({
      role: m.role,
      // 限制单条长度，防止超长输入打爆上游
      content: m.content.slice(0, 2000),
    }))
    .slice(-MAX_TURNS);
}

function textStream(text: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // 分句吐出，模拟流式，前端体验一致
      const parts = text.split(/(?<=[。！？…\n])/);
      let i = 0;
      const timer = setInterval(() => {
        if (i >= parts.length) {
          clearInterval(timer);
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(parts[i]));
        i++;
      }, 90);
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

const PUNCT = "\\s，。！？、；：,.!?;:…~～「」『』\"'“”‘’()（）";

/**
 * 削掉「把对方的话复述一遍」的开头。
 * 小模型（8B 级）经常无视提示词，直接「压力好大啊，是……」，读起来像在复读。
 * 只处理开头 8 个字以内、与用户原话重合 4 字以上的情况，且删完必须有实质内容。
 */
function trimEcho(reply: string, userText: string): string {
  const u = userText.replace(new RegExp(`[${PUNCT}]`, "g"), "");
  const strip = `[${PUNCT}]*`;
  for (let n = Math.min(8, u.length); n >= 4; n--) {
    const frag = u.slice(0, n);
    const body = frag
      .split("")
      .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join(strip);
    // 允许开头有个「嗯。」「唉，」之类的语气词，那个留着
    const re = new RegExp(`^((?:嗯|唉|是)[${PUNCT}]*)?${body}${strip}`);
    const matched = reply.match(re);
    if (!matched) continue;
    const prefix = matched[1] ?? "";
    const rest = reply.slice(matched[0].length).trim();
    if (rest.length >= 6) return (prefix + rest).trim();
  }
  return reply;
}

/** 未配置密钥时的本地演示回复：仅用于保证 UI 可跑通 */
function demoReply(messages: InMsg[]): string {
  const last = messages.filter((m) => m.role === "user").pop()?.content ?? "";
  if (!last.trim()) return "我在。";
  if (last.length < 6) return "嗯，我听着呢。";
  return "嗯，我在。不用整理语言，慢慢说，说完也不用急着好起来。";
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("请求格式不对", { status: 400 });
  }

  const messages = sanitize((body as { messages?: unknown })?.messages);
  if (!messages.length) {
    return new Response("想说什么都可以", { status: 400 });
  }

  const wantsMusic = (body as { wantsMusic?: boolean })?.wantsMusic === true;
  const lastUserMessage =
    messages.filter((m) => m.role === "user").pop()?.content || "";
  const emotion = analyzeEmotion(lastUserMessage);
  const emotionGuidance = getEmotionGuidance(emotion);
  const memory = loadMemory();
  const memoryContext = generateMemoryContext(memory);

  // 上一轮自己的回应：显式要求不要复读，否则小模型很容易顺着一路重复下去
  const lastAssistant =
    [...messages]
      .reverse()
      .find((m) => m.role === "assistant")
      ?.content.trim() ?? "";
  const repeatGuard = lastAssistant
    ? `\n【防重复】你上一轮已经说过：「${lastAssistant.slice(0, 60)}」。这一轮不要重复它的意思、句式或开头，换一个对方那句话里的具体细节接。`
    : "";

  // 如果用户想听歌，在 prompt 中强制要求输出标记
  const musicPrompt = wantsMusic
    ? `\n【音乐推荐】对方想听歌。你简短回应一句后，必须在回复末尾加上 【MUSIC_RECOMMEND】 这四个字。`
    : "";

  const dynamicSystemPrompt =
    SYSTEM_PROMPT + emotionGuidance + memoryContext + repeatGuard + musicPrompt;

  if (!KEY) {
    const demoText = demoReply(messages);
    if (wantsMusic) {
      return textStream(demoText + "\n\n【MUSIC_RECOMMEND】");
    }
    return textStream(demoText);
  }

  let upstream: Response | null = null;
  let reason = "";

  const isQwen3 = /qwen3/i.test(MODEL);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 20_000);

  try {
    upstream = await fetch(`${BASE.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KEY}`,
      },
      signal: ac.signal,
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        temperature: 0.9,
        max_tokens: 220,
        messages: [
          { role: "system", content: dynamicSystemPrompt },
          ...messages,
        ],
        ...(isQwen3 ? { enable_thinking: false } : {}),
      }),
    });
  } catch (err) {
    const e = err as {
      name?: string;
      message?: string;
      cause?: { code?: string };
    };
    reason =
      e?.name === "AbortError"
        ? "等待首包超过 20s"
        : `${e?.message ?? "fetch failed"}${e?.cause?.code ? ` / ${e.cause.code}` : ""}`;
  } finally {
    clearTimeout(timer);
  }

  if (!upstream || !upstream.ok || !upstream.body) {
    if (upstream && !upstream.ok) {
      // 把上游的错误信息留在服务端日志里，否则线上永远只看到那句温和的兜底
      const detail = await upstream.text().catch(() => "");
      reason = `HTTP ${upstream.status} ${detail.slice(0, 240)}`;
    }
    console.error(
      `[anyu/chat] 上游失败 model=${MODEL} base=${BASE} :: ${reason || "空响应"}`,
    );
    return new Response("这会儿有点吵，等一下再说也可以。", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let fullResponse = "";
  // 开头先攒一小段再吐，好在复述用户原话时削掉它；之后就原样透传
  let pending = "";
  let opened = false;
  const OPEN_CHARS = 24;

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (text: string) => {
        if (opened) {
          controller.enqueue(encoder.encode(text));
          return;
        }
        pending += text;
        if (pending.length >= OPEN_CHARS) {
          opened = true;
          controller.enqueue(encoder.encode(trimEcho(pending, lastUserMessage)));
        }
      };

      const reader = upstream.body!.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const s = line.trim();
            if (!s.startsWith("data:")) continue;
            const data = s.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              const delta: string | undefined =
                json?.choices?.[0]?.delta?.content;
              if (delta) {
                fullResponse += delta;
                emit(delta);
              }
            } catch {
              /* 忽略无法解析的分片 */
            }
          }
        }
      } catch {
        /* 上游中断，静默结束 */
      } finally {
        // 上游内容不足 OPEN_CHARS 时，这里补发
        if (!opened && pending) {
          opened = true;
          controller.enqueue(encoder.encode(trimEcho(pending, lastUserMessage)));
        }

        // 检测是否需要推荐音乐
        if (fullResponse.includes("【MUSIC_RECOMMEND】")) {
          const songs = await recommendSongs(emotion.state);
          if (songs.length > 0) {
            const musicText = formatMusicResponse(songs);
            controller.enqueue(encoder.encode(musicText));
            fullResponse += musicText;
          }
        }

        const summary = summarizeConversation(messages);
        if (summary) {
          const { saveMemory, recordSession } =
            await import("@/lib/longterm-memory");
          saveMemory({ lastSummary: summary });
          recordSession(messages);
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}

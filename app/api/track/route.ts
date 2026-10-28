import { beijingDay, isRedisConfigured, redisPipeline } from "@/lib/upstash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 事件白名单：只接受这些名字，杜绝外部随便往库里塞字段 */
const EVENTS = new Set(["page_view", "enter_hole", "open_noise", "checkin"]);
/** 二级标签白名单（白噪音名 / 页面名），避免任意字符串落库 */
const TYPES = new Set([
  "home",
  "chat",
  "silent",
  "settings",
  "rain",
  "wind",
  "fire",
  "forest",
  "indoor",
  "tired",
  "annoyed",
  "powerless",
  "wronged",
  "blank",
]);

const DAY_TTL = 60 * 60 * 24 * 120; // 日维度保留 120 天

function noContent(status = 204) {
  return new Response(null, { status });
}

export async function POST(req: Request) {
  // 未配置存储时直接吞掉，前端无感
  if (!isRedisConfigured()) return noContent();

  const len = Number(req.headers.get("content-length") || 0);
  if (len > 4096) return noContent();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return noContent();
  }

  const { event, type, vid } = (body ?? {}) as {
    event?: unknown;
    type?: unknown;
    vid?: unknown;
  };

  if (typeof event !== "string" || !EVENTS.has(event)) return noContent();

  const label = typeof type === "string" && TYPES.has(type) ? type : "";
  const visitor = typeof vid === "string" && vid.length <= 64 ? vid : "";
  const field = label ? `${event}:${label}` : event;
  const day = beijingDay();

  const cmds: (string | number)[][] = [
    ["HINCRBY", `anyu:stats:${day}`, field, 1],
    ["HINCRBY", "anyu:stats:total", field, 1],
    ["EXPIRE", `anyu:stats:${day}`, DAY_TTL],
  ];

  if (visitor) {
    // HyperLogLog 去重人数：只存随机 ID，不含任何设备信息
    cmds.push(["PFADD", `anyu:uv:${day}`, visitor]);
    cmds.push(["EXPIRE", `anyu:uv:${day}`, DAY_TTL]);
  }

  await redisPipeline(cmds);
  return noContent();
}

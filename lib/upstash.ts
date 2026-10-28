/**
 * Upstash Redis REST 极简封装（不引入 SDK，只用 fetch）
 * 未配置环境变量时全部静默跳过，不影响页面与业务。
 */
const BASE = process.env.UPSTASH_REDIS_REST_URL || "";
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";

export type PipeCommand = (string | number)[];

export function isRedisConfigured() {
  return Boolean(BASE && TOKEN);
}

/** 一次往返执行多条命令，返回 Upstash 的 [{ result } | { error }] 数组 */
export async function redisPipeline(cmds: PipeCommand[]) {
  if (!isRedisConfigured() || !cmds.length) return null;
  try {
    const res = await fetch(`${BASE.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cmds),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as { result?: unknown; error?: string }[];
  } catch {
    return null;
  }
}

/** 统一用北京时间切天，避免 UTC 跨天错位 */
export function beijingDay(offsetDays = 0) {
  const t = Date.now() + 8 * 3600_000 - offsetDays * 86400_000;
  return new Date(t).toISOString().slice(0, 10);
}

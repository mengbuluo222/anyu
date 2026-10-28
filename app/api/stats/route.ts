import { beijingDay, isRedisConfigured, redisPipeline } from "@/lib/upstash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toCounts(flat: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!Array.isArray(flat)) return out;
  for (let i = 0; i + 1 < flat.length; i += 2) {
    out[String(flat[i])] = Number(flat[i + 1]) || 0;
  }
  return out;
}

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * 只读统计接口：/api/stats?days=7&token=xxx
 * STATS_TOKEN 必须配置，否则一律拒绝，避免数据裸奔。
 */
export async function GET(req: Request) {
  if (!isRedisConfigured()) {
    return json({ ok: false, error: "未配置 UPSTASH_REDIS_REST_URL / TOKEN" }, 503);
  }

  const expected = process.env.STATS_TOKEN;
  if (!expected) {
    return json({ ok: false, error: "未配置 STATS_TOKEN" }, 503);
  }

  const url = new URL(req.url);
  if (url.searchParams.get("token") !== expected) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const raw = Number(url.searchParams.get("days") ?? 7);
  const days = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 1), 60) : 7;
  const dates = Array.from({ length: days }, (_, i) => beijingDay(i));

  const cmds: (string | number)[][] = [];
  for (const d of dates) {
    cmds.push(["HGETALL", `anyu:stats:${d}`]);
    cmds.push(["PFCOUNT", `anyu:uv:${d}`]);
  }
  cmds.push(["HGETALL", "anyu:stats:total"]);

  const res = await redisPipeline(cmds);
  if (!res) return json({ ok: false, error: "存储暂不可用" }, 503);

  const rows = dates.map((date, i) => ({
    date,
    uv: Number(res[i * 2 + 1]?.result ?? 0) || 0,
    counts: toCounts(res[i * 2]?.result),
  }));

  return json({
    ok: true,
    days,
    total: toCounts(res[days * 2]?.result),
    rows,
  });
}

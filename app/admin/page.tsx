"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Row = { date: string; uv: number; counts: Record<string, number> };
type Stats = { ok: boolean; days: number; total: Record<string, number>; rows: Row[] };

type Metric = "uv" | "page_view" | "enter_hole" | "checkin" | "open_noise";

const TOKEN_KEY = "anyu.admin.token";

const METRICS: { key: Metric; label: string }[] = [
  { key: "uv", label: "人数" },
  { key: "enter_hole", label: "进树洞" },
  { key: "checkin", label: "打卡" },
  { key: "open_noise", label: "白噪音" },
  { key: "page_view", label: "页览" },
];

const PAGES: Record<string, string> = {
  home: "首页",
  chat: "树洞",
  silent: "静默",
  settings: "设置",
};

const NOISES: Record<string, string> = {
  rain: "雨夜",
  wind: "晚风",
  fire: "壁炉",
  forest: "林间雨声",
  indoor: "阴天室内",
};

const MOODS: Record<string, string> = {
  tired: "疲惫",
  annoyed: "烦躁",
  powerless: "无力",
  wronged: "委屈",
  blank: "茫然",
};

function labelOf(key: string) {
  const [name, sub] = key.split(":");
  if (name === "page_view") return `页览 · ${PAGES[sub] ?? "其他"}`;
  if (name === "enter_hole") return "进入树洞";
  if (name === "open_noise") return `白噪音 · ${NOISES[sub] ?? "其他"}`;
  if (name === "checkin") return `打卡 · ${MOODS[sub] ?? "其他"}`;
  return key;
}

/** 把带标签的键合并成一个指标的总数，如 page_view:chat + page_view:silent */
function sumBy(counts: Record<string, number>, metric: string) {
  return Object.entries(counts).reduce((acc, [k, v]) => {
    return k === metric || k.startsWith(`${metric}:`) ? acc + v : acc;
  }, 0);
}

function metricOf(row: Row, metric: Metric) {
  return metric === "uv" ? row.uv : sumBy(row.counts, metric);
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [input, setInput] = useState("");
  const [days, setDays] = useState(7);
  const [metric, setMetric] = useState<Metric>("uv");
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (tk: string, d: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/stats?days=${d}&token=${encodeURIComponent(tk)}`, {
        cache: "no-store",
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        if (res.status === 401) {
          sessionStorage.removeItem(TOKEN_KEY);
          setToken("");
          setError("口令不对，重新输一次。");
        } else {
          setError(body.error || "读取失败。");
        }
        setData(null);
        return;
      }
      setData(body as Stats);
    } catch {
      setError("网络没通，稍后再试。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem(TOKEN_KEY);
    if (saved) setToken(saved);
  }, []);

  useEffect(() => {
    if (token) void load(token, days);
  }, [token, days, load]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const tk = input.trim();
    if (!tk) return;
    sessionStorage.setItem(TOKEN_KEY, tk);
    setInput("");
    setToken(tk);
  }

  function signOut() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken("");
    setData(null);
  }

  const chrono = useMemo(() => (data ? [...data.rows].reverse() : []), [data]);
  const values = useMemo(() => chrono.map((r) => metricOf(r, metric)), [chrono, metric]);
  const max = Math.max(1, ...values);
  const today = data?.rows[0];

  const totalRows = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.total)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 24);
  }, [data]);

  const totalMax = Math.max(1, ...totalRows.map(([, v]) => v));

  return (
    <main className="page">
      <div className="admin">
        <h1 className="serif">数据</h1>
        <p className="muted" style={{ margin: "0 0 20px" }}>
          只有匿名的次数，没有任何输入内容。
        </p>

        {!token ? (
          <form className="card admin-gate" onSubmit={submit}>
            <label className="admin-gate-label" htmlFor="admin-token">
              统计口令
            </label>
            <input
              id="admin-token"
              className="admin-input"
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="STATS_TOKEN"
              autoComplete="off"
            />
            <button className="btn-soft" type="submit" disabled={!input.trim()}>
              打开
            </button>
            <p className="muted" style={{ margin: "14px 0 0" }}>
              口令只在本次会话里保留，关掉浏览器就没了；它不是密码，泄露了随时去环境变量里换。
            </p>
          </form>
        ) : (
          <>
            <div className="admin-bar">
              <div className="seg">
                {[7, 14, 30].map((d) => (
                  <button
                    key={d}
                    className={d === days ? "on" : ""}
                    onClick={() => setDays(d)}
                    type="button"
                  >
                    {d} 天
                  </button>
                ))}
              </div>
              <div className="admin-bar-right">
                <button className="btn-soft" onClick={() => void load(token, days)} type="button">
                  {loading ? "读取中" : "刷新"}
                </button>
                <button className="btn-soft" onClick={signOut} type="button">
                  退出
                </button>
              </div>
            </div>

            {error ? (
              <p className="admin-error">{error}</p>
            ) : null}

            {!data && loading ? <p className="muted">正在读取……</p> : null}

            {data ? (
              <>
                <div className="kpis">
                  <div className="kpi">
                    <b>{today?.uv ?? 0}</b>
                    <span>今日人数</span>
                  </div>
                  <div className="kpi">
                    <b>{today ? sumBy(today.counts, "enter_hole") : 0}</b>
                    <span>今日进树洞</span>
                  </div>
                  <div className="kpi">
                    <b>{today ? sumBy(today.counts, "checkin") : 0}</b>
                    <span>今日打卡</span>
                  </div>
                  <div className="kpi">
                    <b>{sumBy(data.total, "enter_hole")}</b>
                    <span>累计进树洞</span>
                  </div>
                </div>

                <div className="admin-chart-head">
                  <h2 className="section-title">近 {days} 天</h2>
                  <div className="seg">
                    {METRICS.map((m) => (
                      <button
                        key={m.key}
                        className={m.key === metric ? "on" : ""}
                        onClick={() => setMetric(m.key)}
                        type="button"
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="chart">
                  {chrono.map((row, i) => {
                    const v = values[i];
                    return (
                      <div className="chart-col" key={row.date} title={`${row.date}：${v}`}>
                        <span className="chart-val">{v > 0 && days <= 14 ? v : ""}</span>
                        <div
                          className="chart-bar"
                          style={{ height: `${Math.max((v / max) * 100, v > 0 ? 4 : 0.8)}%` }}
                        />
                        <span className="chart-x">
                          {days <= 14 || (chrono.length - 1 - i) % 5 === 0
                            ? row.date.slice(5)
                            : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="divider" />

                <h2 className="section-title">累计明细</h2>
                {totalRows.length === 0 ? (
                  <p className="muted">还没有数据，先去页面点两下。</p>
                ) : (
                  <div className="rows">
                    {totalRows.map(([key, v]) => (
                      <div className="row" key={key}>
                        <div className="row-main">
                          <div className="row-top">
                            <span>{labelOf(key)}</span>
                            <span className="row-num">{v}</span>
                          </div>
                          <div className="row-track">
                            <div
                              className="row-fill"
                              style={{ width: `${(v / totalMax) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}

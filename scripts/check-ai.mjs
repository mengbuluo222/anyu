/**
 * 排查 AI 接口为什么走兜底：直接打一次上游，把真实状态码和报错打出来。
 * 用法：npm run check:ai
 */
const base = (process.env.AI_BASE_URL || "https://api.deepseek.com/v1").replace(/\/$/, "");
const key = process.env.AI_API_KEY || "";
const model = process.env.AI_MODEL || "deepseek-chat";

console.log("base  :", base);
console.log("model :", model);
console.log(
  "key   :",
  key ? `${key.slice(0, 6)}…${key.slice(-4)}（${key.length} 位）` : "未配置"
);

if (!key) {
  console.log("\n→ 没有 AI_API_KEY，页面会走内置演示回复，不是模型答的。");
  process.exit(0);
}

const started = Date.now();
let res;
try {
  res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      stream: false,
      max_tokens: 32,
      messages: [
        { role: "system", content: "你在测试连通性，只回复两个字：收到。" },
        { role: "user", content: "在吗" },
      ],
    }),
  });
} catch (err) {
  console.log("\n✗ 请求没发出去：", err?.message || err);
  console.log("  cause:", err?.cause?.code || err?.cause || "无");
  console.log("  → 多半是 base 域名写错、DNS/代理问题，或本地代理端口没起。");
  process.exit(1);
}

const cost = Date.now() - started;
const body = await res.text();

console.log("\nstatus:", res.status, `(${cost}ms)`);

if (!res.ok) {
  console.log("body  :", body.slice(0, 600));
  console.log("\n常见原因：");
  console.log("  401 → key 无效或没实名");
  console.log("  404 → AI_MODEL 或 AI_BASE_URL 写错（模型 ID 大小写、日期后缀都算）");
  console.log("  402/429 → 余额不足或被限流");
  process.exit(1);
}

let text = "";
try {
  const json = JSON.parse(body);
  text = json?.choices?.[0]?.message?.content ?? "";
} catch {
  console.log("body  :", body.slice(0, 600));
}

console.log("回复  :", text.trim() || "（空）");
console.log("\n✓ 上游通了。如果页面仍然回兜底，重启 dev server 再试。");

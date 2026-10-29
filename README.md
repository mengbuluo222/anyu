# 安隅 · 情绪树洞

> 不必变好，在这里可以只是疲惫。

一个安静的情绪树洞：不开导、不给方案、不鸡汤。游客匿名进入，记录只留在本机浏览器。

## 页面

| 路径 | 说明 |
|---|---|
| `/` | 着陆页，游客直达，无注册、无手机号 |
| `/chat` | 树洞对话，流式回复，可切白噪音 / 清空 / 导出 |
| `/silent` | 静默陪伴，白噪音 + 情绪打卡（只标记不分析） |
| `/settings` | 本地记忆开关、深浅主题、清空记忆、免责说明 |

## 技术栈

- Next.js 14（App Router）+ TypeScript，无 UI 框架依赖
- 白噪音：Web Audio API 实时合成（雨夜 / 晚风 / 壁炉 / 林间雨声 / 阴天室内），不加载任何音频文件
- 存储：默认 `sessionStorage`（关页即清）；开启「本地记忆」后切到 `localStorage`，永不上云
- AI 调用：`/api/chat` 服务端代理，API Key 不下发前端

## 本地运行

```bash
npm install
cp .env.example .env.local   # 填入 AI_BASE_URL / AI_API_KEY / AI_MODEL
npm run dev
```

未配置 `AI_API_KEY` 时会走内置演示回复，方便先跑通界面。

## 分享图

`public/og.png`（1200×630）已生成并接入 `openGraph.images` / `twitter.images`。
改文案或配色后重新生成：

```bash
npm run og
```

## 首页「今日一句」

文案池在 `lib/lines.ts`，按天取一句，同一天进入看到同一句，每 16 秒缓慢换下一句；
系统开启「减少动效」时只静态显示。

## 匿名计数（两条通道，互不依赖）

只统计事件发生次数，**不采集任何输入内容**，事件名走白名单校验。

| 通道 | 作用 | 配置 |
|---|---|---|
| Vercel Analytics | 现成看板：PV、来源、事件趋势 | 控制台 Settings → Analytics 开启 |
| `/api/track` + Upstash | 自己的底账，可查询任意日期原始数字 | 填 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` |

事件：`page_view` / `enter_hole` / `open_noise`（带白噪音类型）/ `checkin`（带情绪类型）。
未配置 Upstash 时 `/api/track` 直接返回 204，前端无感、页面不受影响。

看板：`/admin`，输入 `STATS_TOKEN` 后可选 7 / 14 / 30 天，看今日人数、进树洞、打卡与累计明细。口令只存 sessionStorage，关浏览器即失效。页面已 noindex，且 `robots.txt` 屏蔽 `/admin` 与 `/api/`。

查数（需 `STATS_TOKEN`）：

```bash
curl "https://你的域名/api/stats?days=7&token=$STATS_TOKEN"
```

返回按天倒序的 `uv`（HyperLogLog 去重人数）与各事件次数，另附累计 `total`。

## 部署

### Vercel

1. 推到 Git 仓库，Vercel 导入，根目录选 `anyu`
2. 环境变量配置 `AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL`、`NEXT_PUBLIC_SITE_URL`
3. 需要自建计数时，在 Vercel 里创建 Upstash Redis 集成，自动注入 `UPSTASH_REDIS_REST_*`
4. 部署完成后在 Vercel 绑定自定义域名

### Cloudflare Workers（OpenNext）

已接入 `@opennextjs/cloudflare`，配置文件为 `wrangler.jsonc` 与 `open-next.config.ts`。

```bash
npx wrangler login
npm run preview   # 本地 workerd 预览（.dev.vars 提供环境变量）
npm run deploy    # 构建并发布
```

密钥通过 `npx wrangler secret put <NAME>` 配置，需设置：`AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL`、`STATS_TOKEN`，以及可选的 `UPSTASH_REDIS_REST_URL`、`UPSTASH_REDIS_REST_TOKEN`。
`NEXT_PUBLIC_SITE_URL` 是构建期变量，本地写进 `.env.production`，Git 集成部署则在 Cloudflare 控制台 Build → Variables 配置。

注意：

- 构建前确保 `NODE_ENV=production`，否则 Next 会以开发模式产物输出并报 `useContext` 错误
- `@vercel/analytics` 在 Cloudflare 上不生效，匿名计数只走 `/api/track` + Upstash
- 免费版 Worker 体积上限为 gzip 后 3 MiB，当前产物约 725 KiB

## 合规约束（改代码时别破）

- 文案与 AI 回复避开：疗愈、治愈、心理疏导、焦虑治疗 等词（见 `lib/prompt.ts`）
- 不强制登录、不收集手机号
- 每页常驻免责声明（`components/Disclaimer.tsx`）
- 埋点只记事件次数（`lib/track.ts`），不采集输入内容

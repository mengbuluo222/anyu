/**
 * 生成分享图 public/og.png（1200x630）
 * 用法：node scripts/gen-og.mjs
 * 说明：用 SVG + sharp 光栅化，避免运行时拉取中文字体。
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const W = 1200;
const H = 630;

const SERIF = "'Source Han Serif SC','Songti SC',SimSun,'Noto Serif CJK SC',serif";
const SANS = "'Source Han Sans SC','PingFang SC','Microsoft YaHei',SimHei,sans-serif";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="8%" r="72%">
      <stop offset="0%" stop-color="#3a3f3a" stop-opacity="0.85"/>
      <stop offset="55%" stop-color="#23262a" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#17181a" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1b1c1f"/>
      <stop offset="100%" stop-color="#141517"/>
    </linearGradient>
    <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#97a893" stop-opacity="0"/>
      <stop offset="50%" stop-color="#97a893" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#97a893" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- 顶栏 -->
  <text x="96" y="104" font-family="${SERIF}" font-size="30" letter-spacing="8" fill="#ded9d1">安隅</text>
  <text x="192" y="104" font-family="${SANS}" font-size="21" letter-spacing="7" fill="#6f6a63">情绪树洞</text>

  <!-- 主标语 -->
  <text x="96" y="286" font-family="${SERIF}" font-size="66" letter-spacing="4" fill="#ded9d1">不必变好，</text>
  <text x="96" y="386" font-family="${SERIF}" font-size="66" letter-spacing="4" fill="#ded9d1">在这里可以只是疲惫。</text>

  <!-- 细分隔线 -->
  <rect x="96" y="446" width="240" height="1.5" fill="url(#line)"/>

  <!-- 副说明 -->
  <text x="96" y="512" font-family="${SANS}" font-size="27" letter-spacing="3.5" fill="#a29c93">没有开导，没有解决方案，没有「想开一点」</text>
  <text x="96" y="562" font-family="${SANS}" font-size="24" letter-spacing="3" fill="#6f6a63">不用注册 · 不用打招呼 · 关掉页面就清空</text>

  <!-- 右下角标记 -->
  <circle cx="1063" cy="520" r="4" fill="#97a893" opacity="0.75"/>
  <text x="1084" y="528" font-family="${SANS}" font-size="19" letter-spacing="4" fill="#6f6a63">ANYU</text>
</svg>`;

await mkdir("public", { recursive: true });
await sharp(Buffer.from(svg))
  .png({ compressionLevel: 9 })
  .toFile("public/og.png");

console.log("生成完成：public/og.png");

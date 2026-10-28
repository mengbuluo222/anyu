import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import TopBar from "@/components/TopBar";
import Disclaimer from "@/components/Disclaimer";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://anyu.example.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "安隅｜情绪树洞，不劝人变好的安静陪伴",
  description:
    "一个安静AI树洞，承接你的情绪，不开导、不给方案、不鸡汤。不想打扰朋友、不想心理咨询时，可以在这里碎碎念。游客直接使用，无需下载。",
  keywords: ["安隅", "情绪树洞", "安静陪伴", "碎碎念", "白噪音", "AI 陪伴"],
  applicationName: "安隅",
  robots: { index: true, follow: true },
  openGraph: {
    title: "安隅｜情绪树洞，不劝人变好的安静陪伴",
    description:
      "一个安静AI树洞，承接你的情绪，不开导、不给方案、不鸡汤。游客直接使用，无需下载。",
    siteName: "安隅 · 情绪树洞",
    type: "website",
    locale: "zh_CN",
    url: SITE,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "安隅 · 情绪树洞：不必变好，在这里可以只是疲惫",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "安隅｜情绪树洞",
    description: "不开导、不给方案、不鸡汤。游客直接使用，无需下载。",
    images: ["/og.png"],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f1ec" },
    { media: "(prefers-color-scheme: dark)", color: "#17181a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeInit = `
(function(){
  try {
    var t = localStorage.getItem('anyu.theme');
    if (!t) {
      t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>
        <div className="shell">
          <TopBar />
          {children}
          <Disclaimer />
        </div>
        <Analytics />
      </body>
    </html>
  );
}

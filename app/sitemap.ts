import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://anyu.example.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/chat`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/silent`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/settings`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}

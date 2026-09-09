import type { MetadataRoute } from "next";
import { allSiteSlugs } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://bigsignaltech.com";
  return [{ url: `${base}/video-downloader`, changeFrequency: "weekly", priority: 1 }, ...allSiteSlugs.map((slug) => ({ url: `${base}/${slug}`, changeFrequency: slug.endsWith("-video-downloader") ? "weekly" as const : "monthly" as const, priority: slug.endsWith("-video-downloader") ? 0.9 : 0.4 }))];
}

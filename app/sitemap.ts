import type { MetadataRoute } from "next";
import { allSiteSlugs } from "@/lib/content";

const base = "https://bigsignaltech.com";
const workerUrl = (process.env.PSEO_SERVICE_URL ?? "https://pseo-worker-production.up.railway.app").replace(/\/$/, "");

type PseoCatalogResponse = {
  ok: boolean;
  entities?: Array<{ slug: string; updatedAt: string }>;
};

async function getPseoEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const response = await fetch(`${workerUrl}/api/public/slugs`, {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return [];

    const payload = (await response.json()) as PseoCatalogResponse;
    if (!payload.ok || !Array.isArray(payload.entities)) return [];

    return payload.entities
      .filter((entity) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entity.slug))
      .map((entity) => ({
        url: `${base}/tools/${entity.slug}`,
        lastModified: new Date(entity.updatedAt),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const coreEntries: MetadataRoute.Sitemap = [
    { url: `${base}/video-downloader`, changeFrequency: "weekly", priority: 1 },
    ...allSiteSlugs.map((slug) => ({
      url: `${base}/${slug}`,
      changeFrequency: slug.endsWith("-video-downloader") ? "weekly" as const : "monthly" as const,
      priority: slug.endsWith("-video-downloader") ? 0.9 : 0.4,
    })),
  ];

  return [...coreEntries, ...(await getPseoEntries())];
}

import type { GeneratedPagePayload, JsonObject, JsonValue, PseoEntityRow } from "../types/pseo.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toText(value: JsonValue | undefined): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

function toStringArray(value: JsonValue | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
}

function textParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${escapeHtml(part)}</p>`)
    .join("");
}

function renderAttributeList(attributes: JsonObject): string {
  const hiddenKeys = new Set([
    "title",
    "description",
    "features",
    "technicalOverview",
    "applicationCategory",
    "operatingSystem",
    "price",
    "priceCurrency",
  ]);
  const rows = Object.entries(attributes)
    .filter(([key, value]) => !hiddenKeys.has(key) && ["string", "number", "boolean"].includes(typeof value))
    .slice(0, 20)
    .map(([key, value]) => {
      const label = key.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
      return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(value))}</dd></div>`;
    });

  return rows.length ? `<section aria-labelledby="key-details"><h2 id="key-details">Key details</h2><dl>${rows.join("")}</dl></section>` : "";
}

function makeCanonical(baseUrl: string, pathPrefix: string, slug: string): string {
  const base = baseUrl.replace(/\/$/, "");
  const prefix = pathPrefix.trim() === "/" ? "" : `/${pathPrefix.replace(/^\/+|\/+$/g, "")}`;
  return `${base}${prefix}/${encodeURIComponent(slug)}`;
}

function softwareJsonLd(entity: PseoEntityRow, title: string, description: string, canonicalUrl: string): Record<string, unknown> {
  const attrs = entity.attributes;
  const price = toText(attrs.price);
  const priceCurrency = toText(attrs.priceCurrency) ?? "USD";
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: title,
    description,
    url: canonicalUrl,
    applicationCategory: toText(attrs.applicationCategory) ?? entity.entity_category,
    operatingSystem: toText(attrs.operatingSystem) ?? "Web",
    ...(price ? { offers: { "@type": "Offer", price, priceCurrency } } : {}),
  };
}

function articleJsonLd(entity: PseoEntityRow, title: string, description: string, canonicalUrl: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    description,
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    dateModified: entity.updated_at.toISOString(),
    keywords: entity.primary_keyword,
    about: { "@type": "Thing", name: entity.primary_keyword },
    author: { "@type": "Organization", name: "BigSignal Tools", url: "https://bigsignaltech.com" },
    publisher: { "@type": "Organization", name: "BigSignal Tools", url: "https://bigsignaltech.com" },
  };
}

export function renderPseoPage(entity: PseoEntityRow, baseUrl: string, pathPrefix: string): GeneratedPagePayload {
  const attrs = entity.attributes;
  const title = toText(attrs.title) ?? entity.primary_keyword;
  const summary = entity.ai_summary.trim();
  const technicalOverview = toText(attrs.technicalOverview) ?? "";
  const description = (toText(attrs.description) ?? summary.replace(/\s+/g, " ")).slice(0, 160);
  const canonicalUrl = makeCanonical(baseUrl, pathPrefix, entity.slug);
  const features = toStringArray(attrs.features).slice(0, 12);
  const category = entity.entity_category.toLowerCase();
  const isSoftware = /software|app|tool|saas|platform|utility/.test(category);
  const jsonLd = isSoftware
    ? softwareJsonLd(entity, title, description, canonicalUrl)
    : articleJsonLd(entity, title, description, canonicalUrl);
  const jsonLdScript = `<script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll("<", "\\u003c")}</script>`;

  const html = [
    `<article data-pseo-entity="${entity.id}" data-category="${escapeHtml(entity.entity_category)}">`,
    `<header><p>${escapeHtml(entity.entity_category)}</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></header>`,
    `<section aria-labelledby="overview"><h2 id="overview">Overview</h2>${textParagraphs(summary)}</section>`,
    technicalOverview
      ? `<section aria-labelledby="technical-overview"><h2 id="technical-overview">Technical overview</h2>${textParagraphs(technicalOverview)}</section>`
      : "",
    features.length
      ? `<section aria-labelledby="features"><h2 id="features">Key features</h2><ul>${features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}</ul></section>`
      : "",
    renderAttributeList(attrs),
    `</article>`,
  ].join("");

  return {
    version: 1,
    operation: "upsert",
    entity: {
      id: entity.id,
      slug: entity.slug,
      category: entity.entity_category,
      updatedAt: entity.updated_at.toISOString(),
    },
    seo: {
      title,
      description,
      canonicalUrl,
      primaryKeyword: entity.primary_keyword,
      entityCategory: entity.entity_category,
    },
    content: { html, jsonLd, jsonLdScript },
    workflow: {
      source: "bigsignal-pseo",
      indexNowUrls: [canonicalUrl],
    },
    generatedAt: new Date().toISOString(),
  };
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdSlot from "@/components/AdSlot";

export const revalidate = 300;

type PseoPagePayload = {
  ok: true;
  seo: {
    title: string;
    description: string;
    canonicalUrl: string;
    primaryKeyword: string;
    entityCategory: string;
  };
  content: {
    html: string;
    jsonLd: Record<string, unknown>;
  };
  entity: {
    id: number;
    slug: string;
    category: string;
    updatedAt: string;
  };
};

const workerUrl = (process.env.PSEO_SERVICE_URL ?? "https://pseo-worker-production.up.railway.app").replace(/\/$/, "");

async function getPage(slug: string): Promise<PseoPagePayload | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;

  const response = await fetch(`${workerUrl}/api/public/page/${encodeURIComponent(slug)}`, {
    next: { revalidate: 300, tags: [`pseo:${slug}`] },
    headers: { Accept: "application/json" },
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`pSEO worker returned ${response.status}`);

  const data = (await response.json()) as Partial<PseoPagePayload>;
  if (!data.ok || !data.seo || !data.content || !data.entity) {
    throw new Error("pSEO worker returned an invalid page payload");
  }
  return data as PseoPagePayload;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);

  if (!page) {
    return {
      title: "Tool page not found",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: page.seo.title,
    description: page.seo.description,
    alternates: { canonical: page.seo.canonicalUrl },
    robots: { index: true, follow: true },
    openGraph: {
      type: "article",
      title: page.seo.title,
      description: page.seo.description,
      url: page.seo.canonicalUrl,
      siteName: "BigSignal Tools",
    },
    twitter: {
      card: "summary_large_image",
      title: page.seo.title,
      description: page.seo.description,
    },
  };
}

export default async function PseoToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  const jsonLd = JSON.stringify(page.content.jsonLd).replace(/</g, "\\u003c");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <div className="container pseo-page-shell">
        <nav className="pseo-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/video-downloader">BigSignal Tools</Link>
          <span aria-hidden="true">/</span>
          <span>{page.seo.entityCategory}</span>
        </nav>

        <div className="pseo-content" dangerouslySetInnerHTML={{ __html: page.content.html }} />

        <section className="pseo-primary-action" aria-labelledby="pseo-primary-action-title">
          <h2 id="pseo-primary-action-title">Ready to use BigSignal?</h2>
          <p>Open the downloader, paste a public media URL, and choose an available format.</p>
          <Link className="button primary" href="/video-downloader">Open Video Downloader</Link>
        </section>

        <AdSlot />

        <p className="legal-note">
          Download only public media you own or are authorized to save. BigSignal does not bypass DRM, paywalls, authentication, or other technical protections.
        </p>
      </div>
    </>
  );
}

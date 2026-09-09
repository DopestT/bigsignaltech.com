import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import InfoPageView from "@/components/InfoPageView";
import { dynamicSlugs, infoPages, platformBySlug, platforms } from "@/lib/content";

export const dynamicParams = false;
export function generateStaticParams() { return dynamicSlugs.map((slug) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const platform = platformBySlug[slug];
  if (platform) return { title: platform.title, description: platform.description, alternates: { canonical: `/${slug}` }, openGraph: { title: platform.title, description: platform.description, url: `/${slug}` } };
  const info = infoPages[slug];
  if (info) return { title: info.title, description: info.description, alternates: { canonical: `/${slug}` } };
  return {};
}

export default async function StaticContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const platform = platformBySlug[slug];
  if (platform) {
    const schema = { "@context": "https://schema.org", "@type": "WebPage", name: platform.title, url: `https://bigsignaltech.com/${slug}`, description: platform.description, isPartOf: { "@type": "WebSite", name: "BigSignal Tools", url: "https://bigsignaltech.com/" } };
    return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} /><section className="page-hero"><div className="container"><div className="section-kicker">{platform.name} downloader</div><h1>{platform.title.split(" — ")[0]}</h1><p>{platform.intro}</p><Link className="cta-link" href="/video-downloader">Open downloader</Link></div></section><section className="section"><div className="container"><div className="grid grid-3"><article className="card"><h3>Fast workflow</h3><p>Paste the source URL, select your preferred mode and quality, then process the media.</p></article><article className="card"><h3>Mobile friendly</h3><p>Designed for phones and tablets as well as desktop browsers.</p></article><article className="card"><h3>Rights-aware</h3><p>Use the tool only for media you own or are legally authorized to save.</p></article></div></div></section><section className="section section-white"><div className="container" style={{ maxWidth: 900 }}><h2>How to download {platform.name} videos</h2><div className="grid grid-3 steps">{["Copy the public video URL","Paste it into the downloader","Choose an available result"].map((step,index) => <article className="card" key={step}><div className="step-num">{index+1}</div><h3 style={{ marginTop: 18 }}>{step}</h3></article>)}</div></div></section><section className="section"><div className="container" style={{ maxWidth: 900 }}><h2>Tips for {platform.name}</h2><div className="grid" style={{ marginTop: 24 }}>{platform.tips.map((tip) => <div className="card" key={tip}><p>✓ {tip}</p></div>)}</div><h2 style={{ marginTop: 54 }}>Other supported sources</h2><div className="grid grid-6" style={{ marginTop: 22 }}>{platforms.filter((p) => p.slug !== slug).map((p) => <Link className="card platform-link" href={`/${p.slug}`} key={p.slug}>{p.name}</Link>)}</div></div></section></>;
  }
  const info = infoPages[slug];
  if (!info) notFound();
  return <InfoPageView page={info} />;
}

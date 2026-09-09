import type { Metadata } from "next";
import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import DownloaderTool from "@/components/DownloaderTool";
import { platforms } from "@/lib/content";

export const metadata: Metadata = {
  title: "Free Online Video Downloader",
  description: "Fast, mobile-friendly online video downloader for public media you own or are authorized to save. Paste a link, choose a format, and resolve available media.",
  alternates: { canonical: "/video-downloader" },
};

const faqs = [
  ["How does the video downloader work?", "Paste a public video URL, choose video or audio mode and a preferred quality, then save an available file when processing is complete."],
  ["Is it free?", "The core downloader is designed to be free to use. Advertising can support the service without putting fake download buttons in the interface."],
  ["What devices are supported?", "The site is designed for modern phones, tablets, laptops, and desktop browsers."],
  ["Can I download any video?", "No. Only download content you own or have permission or legal authorization to save. Platform rules and copyright laws still apply."],
];

const faqSchema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) };
const appSchema = { "@context": "https://schema.org", "@type": "WebApplication", name: "BigSignal Tools Video Downloader", url: "https://bigsignaltech.com/video-downloader", applicationCategory: "MultimediaApplication", operatingSystem: "Any", description: "Online video downloader for public media users own or are authorized to save.", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } };

export default function VideoDownloaderPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <section className="hero"><div className="container hero-inner"><div className="eyebrow"><span aria-hidden="true">⚡</span> Fast, simple, mobile-friendly</div><h1>Download public videos without the clutter</h1><p className="hero-copy">Paste a media link, choose your preferred output, and save content you are authorized to download.</p><DownloaderTool /><p className="legal-note">Use this tool only for media you own or have authorization to save. Protected or DRM-restricted content is not supported.</p></div></section>
      <AdSlot />
      <section id="supported" className="section"><div className="container"><div className="section-kicker">Built for common video sources</div><h2>One clean workflow</h2><p className="section-lead">Direct media links and webpages exposing a public video source work through the built-in resolver. Major social platforms can connect to the dedicated processor layer.</p><div className="grid grid-6" style={{ marginTop: 28 }}>{platforms.map((platform) => <Link key={platform.slug} href={`/${platform.slug}`} className="card platform-link">{platform.name}</Link>)}</div></div></section>
      <AdSlot />
      <section id="how" className="section section-white"><div className="container"><div className="section-kicker">How it works</div><h2>A downloader that does not look like an ad trap</h2><p className="section-lead">The main action stays above the fold, real results appear directly below it, and advertising stays visually separate from every download control.</p><div className="grid grid-3 steps">{[["1","Paste the URL","Copy the public link to media you are authorized to save."],["2","Resolve the media","The backend checks the source and finds an available public media file."],["3","Save the file","Open the resolved file and save it using your browser or device controls."]].map(([n,title,description]) => <article className="card" key={n}><div className="step-num">{n}</div><h3 style={{ marginTop: 18 }}>{title}</h3><p>{description}</p></article>)}</div></div></section>
      <section className="section"><div className="container"><div className="grid grid-3"><article className="card"><h3>Fast by design</h3><p>Server-rendered content, small client islands, and a short path from link to result.</p></article><article className="card"><h3>Works on mobile</h3><p>Responsive controls sized for phones and tablets as well as desktop browsers.</p></article><article className="card"><h3>Clear and trustworthy</h3><p>No fake download buttons. Ads stay visually distinct from the tool itself.</p></article></div></div></section>
      <AdSlot />
      <section className="section section-white"><div className="container" style={{ maxWidth: 860 }}><h2>A better online video downloader experience</h2><p className="section-lead">Online video downloader tools are useful when you need an offline copy of media you created, licensed, or otherwise have permission to save. A strong downloader should make the process obvious: paste a link, see the available choices, select an output, and save the file without misleading buttons or unnecessary pages.</p><p className="section-lead">BigSignal Tools is structured around that workflow while also providing source-specific guidance, common file-format support, mobile downloading, quality choices, and clear troubleshooting messages.</p></div></section>
      <section id="faq" className="section"><div className="container"><h2 style={{ textAlign: "center" }}>Frequently asked questions</h2><div className="faq">{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></div></section>
    </>
  );
}

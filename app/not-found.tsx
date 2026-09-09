import Link from "next/link";

export default function NotFound() { return <section className="section"><div className="container" style={{ maxWidth: 620, textAlign: "center" }}><div style={{ fontSize: 72, fontWeight: 900, color: "#cbd5e1" }}>404</div><h1 style={{ fontSize: 34, marginBottom: 10 }}>Page not found</h1><p className="section-lead" style={{ marginInline: "auto" }}>The page does not exist or has moved.</p><Link className="cta-link" href="/video-downloader">Back to downloader</Link></div></section>; }

import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container header-row">
        <Link href="/video-downloader" className="brand" aria-label="BigSignal Tools home">
          <span className="brand-mark" aria-hidden="true">↓</span><span>BigSignal Tools</span>
        </Link>
        <nav className="nav" aria-label="Primary">
          <Link href="/video-downloader#supported">Sources</Link>
          <Link href="/video-downloader#how">How it works</Link>
          <Link href="/about">About</Link>
          <Link href="/video-downloader#faq">FAQ</Link>
        </nav>
      </div>
    </header>
  );
}

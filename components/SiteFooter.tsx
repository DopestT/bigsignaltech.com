import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-row">
        <div><strong>BigSignal Tools</strong><div className="muted" style={{ marginTop: 5, fontSize: 13 }}>Fast media resolution with a clean, rights-aware interface.</div></div>
        <nav className="footer-links" aria-label="Footer">
          <Link href="/video-downloader">Downloader</Link><Link href="/about">About</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/copyright">Copyright</Link><Link href="/contact">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}

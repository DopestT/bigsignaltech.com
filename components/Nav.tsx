import Link from "next/link";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Nav() {
  return (
    <nav style={{
      background: "var(--surface)",
      borderBottom: "1px solid var(--border)",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      <div className="container" style={{
        display: "flex",
        alignItems: "center",
        height: 56,
        gap: 32,
      }}>
        <Link href="/" style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 8 }}>
          <span aria-hidden style={{ color: "var(--accent)" }}>📡</span>
          <span style={{ color: "var(--text-1)" }}>Big Signal</span>
          <span style={{ color: "var(--accent)" }}>Tech</span>
        </Link>

        <div style={{ display: "flex", gap: 20, flex: 1 }}>
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-2)",
              }}
            >
              {label}
            </Link>
          ))}
        </div>

        <a
          href="https://www.youtube.com"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ fontSize: 12, padding: "7px 16px" }}
        >
          Subscribe ▶
        </a>
      </div>
    </nav>
  );
}

import Link from "next/link";

export default function Footer() {
  return (
    <footer style={{
      background: "var(--surface)",
      borderTop: "1px solid var(--border)",
      padding: "32px 0",
      marginTop: 80,
    }}>
      <div className="container" style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 16,
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>
            <span style={{ color: "var(--text-1)" }}>Big Signal</span>{" "}
            <span style={{ color: "var(--accent)" }}>Tech</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)" }}>
            Cutting through the noise on tech.
          </div>
        </div>

        <div style={{ display: "flex", gap: 24 }}>
          {[
            { href: "/about", label: "About" },
            { href: "/contact", label: "Contact" },
          ].map(({ href, label }) => (
            <Link key={href} href={href} style={{ fontSize: 12, color: "var(--text-3)" }}>
              {label}
            </Link>
          ))}
          <a
            href="https://www.youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: "var(--text-3)" }}
          >
            YouTube
          </a>
        </div>

        <div style={{ fontSize: 12, color: "var(--text-3)" }}>
          © {new Date().getFullYear()} Big Signal Tech
        </div>
      </div>
    </footer>
  );
}

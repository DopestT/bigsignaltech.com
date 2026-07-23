export default function ContactPage() {
  return (
    <div className="container" style={{ maxWidth: 720, padding: "64px 24px 96px" }}>
      <span className="tag" style={{ background: "rgba(45, 212, 191, 0.08)", color: "var(--accent)", marginBottom: 16 }}>
        Contact
      </span>
      <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em", margin: "12px 0 24px", color: "var(--text-1)" }}>
        Get in touch
      </h1>

      <p style={{ fontSize: 15, color: "var(--text-2)", lineHeight: 1.8, marginBottom: 32, maxWidth: 560 }}>
        For business inquiries, sponsorships, or anything else, reach out by email or
        find us on YouTube.
      </p>

      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "28px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        maxWidth: 420,
      }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
            Email
          </div>
          <a href="mailto:hello@bigsignaltech.com" style={{ fontSize: 15, fontWeight: 600, color: "var(--accent)" }}>
            hello@bigsignaltech.com
          </a>
        </div>

        <div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
            YouTube
          </div>
          <a
            href="https://www.youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 15, fontWeight: 600, color: "var(--accent)" }}
          >
            Watch on YouTube ▶
          </a>
        </div>
      </div>
    </div>
  );
}

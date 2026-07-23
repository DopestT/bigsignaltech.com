export default function AboutPage() {
  return (
    <div className="container" style={{ maxWidth: 720, padding: "64px 24px 96px" }}>
      <span className="tag" style={{ background: "rgba(45, 212, 191, 0.08)", color: "var(--accent)", marginBottom: 16 }}>
        About
      </span>
      <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em", margin: "12px 0 24px", color: "var(--text-1)" }}>
        About Big Signal Tech
      </h1>

      <div style={{ fontSize: 15, color: "var(--text-2)", lineHeight: 1.8, display: "flex", flexDirection: "column", gap: 16 }}>
        <p>
          Big Signal Tech is a YouTube channel built around a simple idea: there&apos;s a lot
          of tech noise out there, and not much of it is actually useful. We try to find
          the signal — the products, tools, and ideas that are genuinely worth your time —
          and skip the rest.
        </p>
        <p>
          Expect hands-on reviews, plain-language explainers, and the occasional deep dive
          into how something actually works under the hood.
        </p>
        <p>
          New here? The best place to start is the channel itself — hit subscribe so you
          don&apos;t miss what&apos;s next.
        </p>
      </div>

      <div style={{ marginTop: 40 }}>
        <a
          href="https://www.youtube.com"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ fontSize: 14, padding: "11px 24px" }}
        >
          Subscribe on YouTube ▶
        </a>
      </div>
    </div>
  );
}

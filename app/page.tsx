const TOPICS = [
  {
    icon: "🔍",
    title: "Reviews",
    desc: "Hands-on looks at the gadgets and gear worth your money — and the ones that aren't.",
  },
  {
    icon: "🧩",
    title: "Explainers",
    desc: "Breaking down how the tech actually works, without the jargon.",
  },
  {
    icon: "📡",
    title: "News & trends",
    desc: "What's shipping, what's hype, and what's actually going to matter.",
  },
  {
    icon: "🛠️",
    title: "Deep dives",
    desc: "Longer-form looks at the tools and platforms shaping how we build and live.",
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "80px 0 64px",
      }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(45, 212, 191, 0.08)",
            border: "1px solid rgba(45, 212, 191, 0.25)",
            borderRadius: 20,
            padding: "4px 12px",
            marginBottom: 24,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
              YouTube Channel
            </span>
          </div>

          <h1 style={{
            fontSize: 44,
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            marginBottom: 20,
            color: "var(--text-1)",
          }}>
            Cutting through the noise<br />
            on <span style={{ color: "var(--accent)" }}>tech that matters</span>
          </h1>

          <p style={{
            fontSize: 17,
            color: "var(--text-2)",
            lineHeight: 1.65,
            marginBottom: 32,
            maxWidth: 560,
          }}>
            Big Signal Tech is a YouTube channel covering the gadgets, tools, and ideas
            worth paying attention to — reviews, explainers, and deep dives, minus the filler.
          </p>

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" as const }}>
            <a
              href="https://www.youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ fontSize: 14, padding: "11px 24px" }}
            >
              Subscribe on YouTube ▶
            </a>
            <a href="/about" className="btn btn-secondary" style={{ fontSize: 14, padding: "11px 24px" }}>
              About the channel
            </a>
          </div>
        </div>
      </section>

      {/* What we cover */}
      <section style={{ padding: "72px 0" }}>
        <div className="container">
          <div style={{ maxWidth: 520, marginBottom: 48 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.01em", marginBottom: 12, color: "var(--text-1)" }}>
              What we cover
            </h2>
            <p style={{ color: "var(--text-3)", lineHeight: 1.65, fontSize: 15 }}>
              New tech ships every week. Not all of it is worth your time — this is the
              signal, not the noise.
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 20,
          }}>
            {TOPICS.map((t, i) => (
              <div key={i} style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "26px 26px",
              }}>
                <div style={{ fontSize: 26, marginBottom: 12 }}>{t.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "var(--text-1)" }}>{t.title}</h3>
                <p style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.6 }}>{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        background: "var(--accent)",
        padding: "56px 0",
        textAlign: "center" as const,
      }}>
        <div className="container">
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#06201c", marginBottom: 12 }}>
            Don&apos;t miss the next upload
          </h2>
          <p style={{ fontSize: 15, color: "rgba(6, 32, 28, 0.75)", marginBottom: 28 }}>
            New videos regularly. Subscribe so you don&apos;t have to remember to check.
          </p>
          <a
            href="https://www.youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
            style={{
              background: "#06201c",
              color: "var(--accent)",
              fontWeight: 700,
              fontSize: 15,
              padding: "12px 28px",
            }}
          >
            Subscribe on YouTube ▶
          </a>
        </div>
      </section>
    </div>
  );
}

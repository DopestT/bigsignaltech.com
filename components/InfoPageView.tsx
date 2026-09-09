import type { InfoPage } from "@/lib/content";

export default function InfoPageView({ page }: { page: InfoPage }) {
  return (
    <section className="section">
      <article className="container info-article">
        <div className="section-kicker">Site information</div>
        <h1 style={{ fontSize: "clamp(38px,6vw,54px)", margin: "10px 0 0", letterSpacing: "-.04em" }}>{page.title}</h1>
        <p className="section-lead" style={{ fontSize: 17 }}>{page.description}</p>
        {page.sections.map(([heading, body]) => (
          <section className="info-block" key={heading}><h2>{heading}</h2><p>{body}</p></section>
        ))}
        <p className="muted" style={{ marginTop: 48, borderTop: "1px solid #e2e8f0", paddingTop: 20, fontSize: 13 }}>Last updated: September 9, 2026. BigSignal Tools is a BigSignalTech.com utility.</p>
      </article>
    </section>
  );
}

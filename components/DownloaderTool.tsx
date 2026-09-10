"use client";

import { FormEvent, useMemo, useState } from "react";
import styles from "./LeadCapture.module.css";

type MediaItem = { type?: string; url: string; filename?: string };
type MediaResult = { ok: true; title?: string; source?: string; thumbnail?: string; items: MediaItem[] };

function platformFromUrl(raw: string) {
  try {
    const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
    if (host.includes("youtube") || host === "youtu.be") return "youtube";
    if (host.includes("tiktok")) return "tiktok";
    if (host.includes("instagram")) return "instagram";
    if (host.includes("facebook") || host === "fb.watch") return "facebook";
    if (host.includes("twitter") || host === "x.com") return "x";
    if (host.includes("vimeo")) return "vimeo";
    return host || "unknown";
  } catch {
    return "unknown";
  }
}

function acquisitionSource() {
  if (typeof window === "undefined") return "direct";
  const params = new URLSearchParams(window.location.search);
  const campaignSource = params.get("utm_source");
  if (campaignSource) return campaignSource.slice(0, 120);
  if (!document.referrer) return "direct";
  try {
    return new URL(document.referrer).hostname.replace(/^www\./, "").slice(0, 120) || "direct";
  } catch {
    return "direct";
  }
}

export default function DownloaderTool() {
  const [url, setUrl] = useState("");
  const [quality, setQuality] = useState("1080");
  const [mode, setMode] = useState<"video" | "audio">("video");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<MediaResult | null>(null);
  const [leadEmail, setLeadEmail] = useState("");
  const [leadCompany, setLeadCompany] = useState("");
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [leadSaved, setLeadSaved] = useState(false);
  const buttonLabel = useMemo(() => loading ? "Finding media…" : mode === "audio" ? "Get Audio" : "Download Video", [loading, mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage(""); setResult(null); setLeadError(""); setLeadSaved(false);
    const candidate = url.trim();
    if (!candidate) { setError("Paste a video URL first."); return; }
    try { const parsed = new URL(candidate); if (!["http:", "https:"].includes(parsed.protocol)) throw new Error(); }
    catch { setError("Enter a valid http or https URL."); return; }

    setLoading(true);
    try {
      const response = await fetch("/api/resolve-media", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ url: candidate, quality, mode }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Unable to resolve that link.");
      setResult(data);
      setMessage(`${data.items?.length || 0} downloadable ${data.items?.length === 1 ? "item" : "items"} found.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to process that link.");
    } finally {
      setLoading(false);
    }
  }

  async function captureLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLeadError("");
    if (!leadEmail.trim()) { setLeadError("Enter your email address."); return; }
    setLeadLoading(true);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          email: leadEmail.trim(),
          company: leadCompany,
          source: acquisitionSource(),
          landingPage: typeof window !== "undefined" ? window.location.pathname : "/video-downloader",
          platform: platformFromUrl(url),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Unable to save your email.");
      setLeadSaved(true);
      setLeadEmail("");
    } catch (err) {
      setLeadError(err instanceof Error ? err.message : "Unable to save your email.");
    } finally {
      setLeadLoading(false);
    }
  }

  return (
    <>
      <form className="tool-card" onSubmit={submit}>
        <div className="tool-row">
          <label className="url-wrap">
            <span className="url-icon" aria-hidden="true">↗</span>
            <span className="sr-only">Video URL</span>
            <input value={url} onChange={(e) => setUrl(e.target.value)} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Paste video URL here" aria-label="Video URL" required />
          </label>
          <button className="primary-button" disabled={loading} type="submit">
            {loading && <span className="button-spinner" aria-hidden="true" />}
            {buttonLabel}
          </button>
        </div>
        <div className="tool-options">
          <label className="select-pill"><span>Format</span><select value={mode} onChange={(e) => setMode(e.target.value as "video" | "audio")}><option value="video">Video</option><option value="audio">Audio</option></select></label>
          {mode === "video" && <label className="select-pill"><span>Quality</span><select value={quality} onChange={(e) => setQuality(e.target.value)}><option value="720">720p</option><option value="1080">1080p</option><option value="1440">1440p</option><option value="2160">2160p</option><option value="max">Max</option></select></label>}
        </div>
      </form>

      <div aria-live="polite">
        {message && <div className="status status-success">{message}</div>}
        {error && <div className="status status-error"><span aria-hidden="true">!</span><span>{error}</span></div>}
      </div>

      {result?.items?.length ? (
        <>
          <section className="result-card" aria-label="Download results">
            <div className="result-head">
              {result.thumbnail ? <img src={result.thumbnail} alt="Video thumbnail" className="result-thumb" /> : <div className="result-placeholder" aria-hidden="true">▶</div>}
              <div className="result-copy"><div className="result-kicker">Media found</div><div className="result-title">{result.title || "Ready to download"}</div><div className="result-meta">{result.source === "processor" ? "Processed media" : result.source === "direct" ? "Direct media file" : "Media discovered on page"}</div></div>
            </div>
            <div className="result-list">
              {result.items.map((item, index) => <a className="result-link" key={`${item.url}-${index}`} href={item.url} target="_blank" rel="noopener noreferrer"><span className="result-link-main"><span aria-hidden="true">{item.type === "audio" ? "♪" : "↓"}</span><span>{item.filename || `Download ${item.type || "media"}`}</span></span><span aria-hidden="true">↗</span></a>)}
            </div>
            <p className="result-note">The file opens from its source or configured media processor. On iPhone/iPad, use the browser share/save controls if the file opens in a player.</p>
          </section>

          <section className={styles.card} aria-label="BigSignal updates">
            <div className={styles.copy}>
              <div className={styles.kicker}>Keep the signal</div>
              <h3>Get new free BigSignal tools first.</h3>
              <p>No account required. Drop your email after a successful use and we’ll send occasional product updates and new-tool launches.</p>
            </div>
            {leadSaved ? (
              <div className={styles.success} role="status"><strong>You’re on the list.</strong><span>We’ll keep it useful and occasional.</span></div>
            ) : (
              <form className={styles.form} onSubmit={captureLead}>
                <label className="sr-only" htmlFor="bigsignal-lead-email">Email address</label>
                <input id="bigsignal-lead-email" type="email" inputMode="email" autoComplete="email" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} placeholder="you@example.com" required />
                <div className={styles.honeypot} aria-hidden="true"><label>Company<input tabIndex={-1} autoComplete="off" value={leadCompany} onChange={(e) => setLeadCompany(e.target.value)} /></label></div>
                <button type="submit" disabled={leadLoading}>{leadLoading ? "Joining…" : "Keep me in the loop"}</button>
                <p className={styles.consent}>By joining, you agree to receive occasional BigSignal Tools product updates. Unsubscribe anytime.</p>
                {leadError && <div className={styles.error} role="alert">{leadError}</div>}
              </form>
            )}
          </section>
        </>
      ) : null}
    </>
  );
}

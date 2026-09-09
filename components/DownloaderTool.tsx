"use client";

import { FormEvent, useMemo, useState } from "react";

type MediaItem = { type?: string; url: string; filename?: string };
type MediaResult = { ok: true; title?: string; source?: string; thumbnail?: string; items: MediaItem[] };

export default function DownloaderTool() {
  const [url, setUrl] = useState("");
  const [quality, setQuality] = useState("1080");
  const [mode, setMode] = useState<"video" | "audio">("video");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<MediaResult | null>(null);
  const buttonLabel = useMemo(() => loading ? "Finding media…" : mode === "audio" ? "Get Audio" : "Download Video", [loading, mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage(""); setResult(null);
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
      ) : null}
    </>
  );
}

"use client";

import { FormEvent, useMemo, useState } from "react";

type MediaItem = { type?: string; url: string; filename?: string };
type MediaResult = { ok: true; title?: string; source?: string; items: MediaItem[] };

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
    event.preventDefault(); setError(""); setMessage(""); setResult(null);
    const candidate = url.trim();
    if (!candidate) { setError("Paste a video URL first."); return; }
    try { const parsed = new URL(candidate); if (!["http:", "https:"].includes(parsed.protocol)) throw new Error(); } catch { setError("Enter a valid http or https URL."); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/resolve-media", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ url: candidate, quality, mode }) });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Unable to resolve that link.");
      setResult(data); setMessage(`${data.items?.length || 0} downloadable ${data.items?.length === 1 ? "item" : "items"} found.`);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to process that link."); }
    finally { setLoading(false); }
  }

  return (
    <>
      <form className="tool-card" onSubmit={submit}>
        <div className="tool-row">
          <label className="url-wrap"><span aria-hidden="true" style={{ marginRight: 10, color: "#94a3b8" }}>↗</span><span className="sr-only">Video URL</span><input value={url} onChange={(e) => setUrl(e.target.value)} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Paste video URL here" aria-label="Video URL" required /></label>
          <button className="primary-button" disabled={loading} type="submit">{buttonLabel}</button>
        </div>
        <div className="tool-options">
          <label className="select-pill">Format<select value={mode} onChange={(e) => setMode(e.target.value as "video" | "audio")}><option value="video">Video</option><option value="audio">Audio</option></select></label>
          {mode === "video" && <label className="select-pill">Quality<select value={quality} onChange={(e) => setQuality(e.target.value)}><option value="720">720p</option><option value="1080">1080p</option><option value="1440">1440p</option><option value="2160">2160p</option><option value="max">Max</option></select></label>}
        </div>
      </form>
      <div aria-live="polite">{message && <div className="status status-success">{message}</div>}{error && <div className="status status-error">{error}</div>}</div>
      {result?.items?.length ? <section className="result-card" aria-label="Download results"><div className="result-title">{result.title || "Media ready"}</div><div className="result-meta">{result.source === "processor" ? "Processed media" : result.source === "direct" ? "Direct media file" : "Media discovered on page"}</div><div className="result-list">{result.items.map((item, index) => <a className="result-link" key={`${item.url}-${index}`} href={item.url} target="_blank" rel="noopener noreferrer"><span>{item.filename || `Download ${item.type || "media"}`}</span><span aria-hidden="true">↗</span></a>)}</div></section> : null}
    </>
  );
}

import type { GeneratedPagePayload } from "../types/pseo.js";

export interface EdgePublisherConfig {
  endpoint: string;
  apiKey: string;
  timeoutMs?: number;
}

export interface PublishResult {
  ok: boolean;
  status: number;
  publishedUrls: string[];
}

export interface UrlVerificationResult {
  ready: string[];
  failed: Array<{ url: string; status: number }>;
}

export async function publishGeneratedPages(
  pages: readonly GeneratedPagePayload[],
  config: EdgePublisherConfig,
  idempotencyKey: string,
): Promise<PublishResult> {
  const endpoint = config.endpoint.trim();
  const apiKey = config.apiKey.trim();
  if (!endpoint || !apiKey) throw new Error("Edge publisher is not configured");
  if (pages.length === 0) return { ok: true, status: 204, publishedUrls: [] };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? 20_000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        version: 1,
        operation: "upsert_batch",
        source: "bigsignal-pseo",
        pages,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 500);
      throw new Error(`Edge publisher rejected batch (${response.status})${detail ? `: ${detail}` : ""}`);
    }

    return {
      ok: true,
      status: response.status,
      publishedUrls: pages.map((page) => page.seo.canonicalUrl),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function verifyOne(url: string, timeoutMs: number): Promise<{ url: string; status: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });

    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        redirect: "follow",
        cache: "no-store",
        signal: controller.signal,
      });
    }

    return { url, status: response.status };
  } catch {
    return { url, status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

export async function verifyPublishedUrls(
  urls: readonly string[],
  concurrency = 8,
  timeoutMs = 7_000,
): Promise<UrlVerificationResult> {
  const unique = [...new Set(urls)];
  const results: Array<{ url: string; status: number }> = new Array(unique.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      const url = unique[index];
      if (url === undefined) return;
      results[index] = await verifyOne(url, timeoutMs);
    }
  };

  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), unique.length) }, () => worker()));

  const ready: string[] = [];
  const failed: Array<{ url: string; status: number }> = [];
  for (const result of results) {
    if (!result) continue;
    if (result.status >= 200 && result.status < 300) ready.push(result.url);
    else failed.push(result);
  }

  return { ready, failed };
}

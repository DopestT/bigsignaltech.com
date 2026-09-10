export interface IndexNowConfig {
  host: string;
  key: string;
  keyLocation?: string;
  endpoint?: string;
  timeoutMs?: number;
  retries?: number;
}

export interface IndexNowResult {
  ok: boolean;
  status: number;
  submitted: number;
  submittedAt: string;
}

const DEFAULT_ENDPOINT = "https://api.indexnow.org/indexnow";
const MAX_URLS_PER_REQUEST = 10_000;

function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function normalizeUrls(urls: readonly string[], host: string): string[] {
  const expectedHost = normalizeHost(host);
  const unique = new Set<string>();

  for (const raw of urls) {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error(`IndexNow URL must be HTTP(S): ${raw}`);
    }
    if (parsed.host.toLowerCase() !== expectedHost) {
      throw new Error(`IndexNow URL host mismatch: ${parsed.host} !== ${expectedHost}`);
    }
    unique.add(parsed.toString());
  }

  return [...unique];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function dispatchIndexNow(urls: readonly string[], config: IndexNowConfig): Promise<IndexNowResult> {
  const host = normalizeHost(config.host);
  if (!host) throw new Error("IndexNow host is required");
  if (!config.key?.trim()) throw new Error("IndexNow key is required");

  const urlList = normalizeUrls(urls, host);
  if (urlList.length === 0) {
    return { ok: true, status: 204, submitted: 0, submittedAt: new Date().toISOString() };
  }
  if (urlList.length > MAX_URLS_PER_REQUEST) {
    throw new Error(`IndexNow accepts at most ${MAX_URLS_PER_REQUEST} URLs per request`);
  }

  const endpoint = config.endpoint ?? DEFAULT_ENDPOINT;
  const key = config.key.trim();
  const keyLocation = config.keyLocation ?? `https://${host}/${encodeURIComponent(key)}.txt`;
  const timeoutMs = config.timeoutMs ?? 8_000;
  const retries = config.retries ?? 2;

  let lastStatus = 0;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Accept: "application/json, text/plain, */*",
          "User-Agent": "BigSignal-pSEO/1.0",
        },
        body: JSON.stringify({ host, key, keyLocation, urlList }),
        signal: controller.signal,
      });
      lastStatus = response.status;

      if (response.ok) {
        return {
          ok: true,
          status: response.status,
          submitted: urlList.length,
          submittedAt: new Date().toISOString(),
        };
      }

      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === retries) {
        const detail = (await response.text().catch(() => "")).slice(0, 500);
        throw new Error(`IndexNow rejected request (${response.status})${detail ? `: ${detail}` : ""}`);
      }
    } catch (error) {
      if (attempt === retries) throw error;
    } finally {
      clearTimeout(timer);
    }

    await sleep(250 * 2 ** attempt + Math.floor(Math.random() * 100));
  }

  return { ok: false, status: lastStatus, submitted: 0, submittedAt: new Date().toISOString() };
}

export async function dispatchIndexNowBatches(urls: readonly string[], config: IndexNowConfig): Promise<IndexNowResult[]> {
  const normalized = normalizeUrls(urls, config.host);
  const results: IndexNowResult[] = [];

  for (let start = 0; start < normalized.length; start += MAX_URLS_PER_REQUEST) {
    results.push(await dispatchIndexNow(normalized.slice(start, start + MAX_URLS_PER_REQUEST), config));
  }

  return results;
}

export type PaidCompetition = "LOW" | "MEDIUM" | "HIGH" | null;

export interface DataForSeoMetric {
  keyword: string;
  searchVolume: number;
  cpc: number;
  competition: PaidCompetition;
  competitionIndex: number | null;
}

export interface DataForSeoConfig {
  login: string;
  password: string;
  locationCode?: number;
  languageCode?: string;
  timeoutMs?: number;
}

interface DataForSeoResultItem {
  keyword?: string | null;
  search_volume?: number | null;
  cpc?: number | null;
  competition?: string | null;
  competition_index?: number | null;
}

interface DataForSeoTask {
  status_code?: number;
  status_message?: string;
  result?: DataForSeoResultItem[] | null;
}

interface DataForSeoResponse {
  status_code?: number;
  status_message?: string;
  tasks_error?: number;
  tasks?: DataForSeoTask[] | null;
}

const ENDPOINT = "https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live";
const SUCCESS_CODE = 20000;

function normalizedKey(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

function toCompetition(value: string | null | undefined): PaidCompetition {
  if (value === "LOW" || value === "MEDIUM" || value === "HIGH") return value;
  return null;
}

export async function fetchLiveSearchMetrics(
  keywords: readonly string[],
  config: DataForSeoConfig,
): Promise<DataForSeoMetric[]> {
  const login = config.login.trim();
  const password = config.password.trim();
  if (!login || !password) throw new Error("DataForSEO credentials are not configured");

  const uniqueKeywords = [...new Map(
    keywords
      .map((keyword) => keyword.trim())
      .filter(Boolean)
      .map((keyword) => [normalizedKey(keyword), keyword] as const),
  ).values()];

  if (uniqueKeywords.length === 0) return [];
  if (uniqueKeywords.length > 1000) throw new Error("DataForSEO batch exceeds 1000 keywords");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? 20_000);

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify([
        {
          keywords: uniqueKeywords,
          location_code: config.locationCode ?? 2840,
          language_code: config.languageCode ?? "en",
        },
      ]),
      signal: controller.signal,
    });

    const body = (await response.json().catch(() => null)) as DataForSeoResponse | null;
    if (!response.ok || !body) {
      throw new Error(`DataForSEO HTTP request failed (${response.status})`);
    }
    if (body.status_code !== undefined && body.status_code !== SUCCESS_CODE) {
      throw new Error(`DataForSEO rejected request: ${body.status_message ?? body.status_code}`);
    }

    const tasks = body.tasks ?? [];
    const failedTask = tasks.find((task) => task.status_code !== undefined && task.status_code !== SUCCESS_CODE);
    if (failedTask) {
      throw new Error(`DataForSEO task failed: ${failedTask.status_message ?? failedTask.status_code}`);
    }

    const metrics = new Map<string, DataForSeoMetric>();
    for (const task of tasks) {
      for (const item of task.result ?? []) {
        const keyword = item.keyword?.trim();
        if (!keyword) continue;
        metrics.set(normalizedKey(keyword), {
          keyword,
          searchVolume: Math.max(0, item.search_volume ?? 0),
          cpc: Math.max(0, item.cpc ?? 0),
          competition: toCompetition(item.competition),
          competitionIndex: item.competition_index ?? null,
        });
      }
    }

    return uniqueKeywords.map((keyword) => metrics.get(normalizedKey(keyword)) ?? {
      keyword,
      searchVolume: 0,
      cpc: 0,
      competition: null,
      competitionIndex: null,
    });
  } finally {
    clearTimeout(timer);
  }
}

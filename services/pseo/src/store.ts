import type { JsonObject, PseoEntityRow } from "./types/pseo.js";

export interface UpsertEntityInput {
  slug: string;
  primary_keyword: string;
  entity_category: string;
  attributes: JsonObject;
  ai_summary: string;
}

export type ClaimBatchResult =
  | { state: "claimed" }
  | { state: "processing" }
  | { state: "conflict" }
  | { state: "replay"; response: Record<string, unknown> };

export interface PseoStore {
  health(): Promise<boolean>;
  getEntityById(id: number): Promise<PseoEntityRow | null>;
  getEntityBySlug(slug: string): Promise<PseoEntityRow | null>;
  claimBatch(key: string, hash: string): Promise<ClaimBatchResult>;
  completeBatch(key: string, payload: Record<string, unknown>): Promise<void>;
  failBatch(key: string, error: string): Promise<void>;
  upsertEntities(items: readonly UpsertEntityInput[]): Promise<PseoEntityRow[]>;
}

export interface SupabasePseoStoreConfig {
  url: string;
  anonKey: string;
  token: string;
  timeoutMs?: number;
}

interface RawEntity {
  id: number;
  slug: string;
  primary_keyword: string;
  entity_category: string;
  attributes: JsonObject;
  ai_summary: string;
  is_indexed: boolean;
  updated_at: string;
}

function normalizeEntity(value: unknown): PseoEntityRow {
  if (!value || typeof value !== "object") throw new Error("Invalid pSEO entity response");
  const row = value as RawEntity;
  if (!Number.isInteger(row.id) || typeof row.slug !== "string" || typeof row.updated_at !== "string") {
    throw new Error("Malformed pSEO entity response");
  }

  return {
    id: row.id,
    slug: row.slug,
    primary_keyword: row.primary_keyword,
    entity_category: row.entity_category,
    attributes: row.attributes ?? {},
    ai_summary: row.ai_summary ?? "",
    is_indexed: Boolean(row.is_indexed),
    updated_at: new Date(row.updated_at),
  };
}

export class SupabasePseoStore implements PseoStore {
  private readonly baseUrl: string;
  private readonly anonKey: string;
  private readonly token: string;
  private readonly timeoutMs: number;

  constructor(config: SupabasePseoStoreConfig) {
    this.baseUrl = config.url.trim().replace(/\/$/, "");
    this.anonKey = config.anonKey.trim();
    this.token = config.token.trim();
    this.timeoutMs = config.timeoutMs ?? 10_000;

    if (!this.baseUrl || !this.anonKey || !this.token) {
      throw new Error("SUPABASE_URL, SUPABASE_ANON_KEY and PSEO_DB_TOKEN are required");
    }
  }

  private async rpc<T>(functionName: string, payload: Record<string, unknown>): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/rest/v1/rpc/${functionName}`, {
        method: "POST",
        headers: {
          apikey: this.anonKey,
          Authorization: `Bearer ${this.anonKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ p_token: this.token, ...payload }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = (await response.text().catch(() => "")).slice(0, 800);
        throw new Error(`Perception pSEO RPC ${functionName} failed (${response.status})${detail ? `: ${detail}` : ""}`);
      }

      const text = await response.text();
      if (!text) return undefined as T;
      return JSON.parse(text) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  async health(): Promise<boolean> {
    return this.rpc<boolean>("pseo_store_health", {});
  }

  async getEntityById(id: number): Promise<PseoEntityRow | null> {
    const raw = await this.rpc<unknown>("pseo_get_entity", { p_entity_id: id });
    return raw === null ? null : normalizeEntity(raw);
  }

  async getEntityBySlug(slug: string): Promise<PseoEntityRow | null> {
    const raw = await this.rpc<unknown>("pseo_get_entity_by_slug", { p_slug: slug });
    return raw === null ? null : normalizeEntity(raw);
  }

  async claimBatch(key: string, hash: string): Promise<ClaimBatchResult> {
    const result = await this.rpc<ClaimBatchResult>("pseo_claim_batch", {
      p_key: key,
      p_hash: hash,
    });
    if (!result || !["claimed", "processing", "conflict", "replay"].includes(result.state)) {
      throw new Error("Invalid claim response from Perception pSEO store");
    }
    return result;
  }

  async completeBatch(key: string, payload: Record<string, unknown>): Promise<void> {
    await this.rpc<boolean>("pseo_complete_batch", { p_key: key, p_payload: payload });
  }

  async failBatch(key: string, error: string): Promise<void> {
    await this.rpc<boolean>("pseo_fail_batch", { p_key: key, p_error: error });
  }

  async upsertEntities(items: readonly UpsertEntityInput[]): Promise<PseoEntityRow[]> {
    const raw = await this.rpc<unknown[]>("pseo_upsert_entities", { p_items: items });
    if (!Array.isArray(raw)) throw new Error("Invalid upsert response from Perception pSEO store");
    return raw.map(normalizeEntity);
  }
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface PseoEntityRow {
  id: number;
  slug: string;
  primary_keyword: string;
  entity_category: string;
  attributes: JsonObject;
  ai_summary: string;
  is_indexed: boolean;
  updated_at: Date;
}

export interface SeoMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  primaryKeyword: string;
  entityCategory: string;
}

export interface GeneratedPagePayload {
  version: 1;
  operation: "upsert";
  entity: {
    id: number;
    slug: string;
    category: string;
    updatedAt: string;
  };
  seo: SeoMetadata;
  content: {
    html: string;
    jsonLd: Record<string, unknown>;
    jsonLdScript: string;
  };
  workflow: {
    source: "bigsignal-pseo";
    indexNowUrls: string[];
  };
  generatedAt: string;
}

import OpenAI from "openai";

export interface ContentGenerationParams {
  targetKeyword: string;
  category: string;
  searchVolume?: number;
  cpc?: number;
  competitionIndex?: number | null;
}

export interface GeneratedEntityContent {
  aiSummary: string;
  technicalOverview: string;
}

export interface ContentGeneratorConfig {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
}

interface StructuredContentResponse {
  aiSummary: string;
  technicalOverview: string;
}

const CONTENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["aiSummary", "technicalOverview"],
  properties: {
    aiSummary: { type: "string" },
    technicalOverview: { type: "string" },
  },
} as const;

function validateParsedContent(value: unknown): StructuredContentResponse {
  if (!value || typeof value !== "object") throw new Error("OpenAI returned an invalid content object");
  const record = value as Record<string, unknown>;
  const aiSummary = typeof record.aiSummary === "string" ? record.aiSummary.trim() : "";
  const technicalOverview = typeof record.technicalOverview === "string" ? record.technicalOverview.trim() : "";

  if (aiSummary.length < 300 || technicalOverview.length < 500) {
    throw new Error("OpenAI content failed minimum quality-length checks");
  }

  return { aiSummary, technicalOverview };
}

export async function generateEntityContent(
  params: ContentGenerationParams,
  config: ContentGeneratorConfig,
): Promise<GeneratedEntityContent> {
  const apiKey = config.apiKey.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const client = new OpenAI({
    apiKey,
    timeout: config.timeoutMs ?? 35_000,
    maxRetries: 2,
  });

  const metricContext = [
    params.searchVolume !== undefined ? `Google Ads monthly search volume: ${params.searchVolume}` : null,
    params.cpc !== undefined ? `Google Ads CPC: ${params.cpc}` : null,
    params.competitionIndex !== undefined && params.competitionIndex !== null
      ? `Google Ads paid competition index: ${params.competitionIndex}`
      : null,
  ].filter((value): value is string => Boolean(value));

  const response = await client.responses.create({
    model: config.model ?? "gpt-5.6-terra",
    store: false,
    reasoning: { effort: "low" },
    max_output_tokens: 1800,
    instructions: [
      "You are a technical content engineer for BigSignal Tools.",
      "Produce genuinely useful, entity-specific content for a programmatic SEO page.",
      "Answer search intent directly and avoid generic filler, keyword stuffing, unverifiable superlatives, fake firsthand claims, or invented product capabilities.",
      "Treat supplied DataForSEO metrics as Google Ads keyword metrics, not organic ranking difficulty.",
      "Do not mention that the copy was AI-generated.",
    ].join(" "),
    input: [
      `Target keyword: ${params.targetKeyword}`,
      `Entity category: ${params.category}`,
      metricContext.length ? metricContext.join("\n") : "No keyword metrics were supplied.",
      "Write an authoritative summary of roughly 100-150 words and a technical overview of roughly 180-260 words. Keep every sentence specific to the target entity and useful to a human reader.",
    ].join("\n\n"),
    text: {
      format: {
        type: "json_schema",
        name: "bigsignal_pseo_content",
        strict: true,
        schema: CONTENT_SCHEMA,
      },
    },
  });

  if (response.status !== "completed" || !response.output_text) {
    throw new Error(`OpenAI content generation did not complete (${response.status})`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.output_text);
  } catch {
    throw new Error("OpenAI returned malformed structured content");
  }

  return validateParsedContent(parsed);
}

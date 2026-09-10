import { createHash, timingSafeEqual } from "node:crypto";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import type { Pool } from "pg";
import { generateEntityContent } from "../services/content.js";
import { fetchLiveSearchMetrics, type PaidCompetition } from "../services/dataforseo.js";
import { dispatchIndexNowBatches } from "../services/indexnow.js";
import { publishGeneratedPages, verifyPublishedUrls } from "../services/publisher.js";
import { renderPseoPage } from "../templates/render.js";
import type { GeneratedPagePayload, PseoEntityRow } from "../types/pseo.js";

interface BatchItem {
  targetKeyword: string;
  category: string;
  aiSummary?: string;
  technicalOverview?: string;
  searchVolume?: number;
  cpc?: number;
  competition?: PaidCompetition;
  competitionIndex?: number | null;
}

interface BatchOptions {
  enrichMetrics?: boolean;
  generateContent?: boolean;
  publish?: boolean;
  dispatchIndexNow?: boolean;
  includeGeneratedPages?: boolean;
}

interface BatchPayload {
  workflowRunId?: string;
  source?: string;
  items: BatchItem[];
  options?: BatchOptions;
}

interface PreparedItem {
  targetKeyword: string;
  category: string;
  aiSummary: string;
  technicalOverview: string;
  searchVolume: number;
  cpc: number;
  competition: PaidCompetition;
  competitionIndex: number | null;
}

interface PseoBatchRouteOptions {
  db: Pool;
  internalApiKey: string;
  publicSiteUrl: string;
  pathPrefix: string;
  dataForSeoLogin: string;
  dataForSeoPassword: string;
  openAiApiKey: string;
  openAiModel: string;
  edgeIngestUrl: string;
  edgeIngestApiKey: string;
  indexNowHost: string;
  indexNowKey: string;
  indexNowKeyLocation: string;
}

interface StoredRun {
  request_hash: string;
  status: "processing" | "completed" | "failed";
  response_payload: Record<string, unknown> | null;
}

class RouteError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function secureEquals(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function authorized(request: FastifyRequest, expected: string): boolean {
  const headerKey = request.headers["x-internal-api-key"];
  const bearer = request.headers.authorization?.startsWith("Bearer ")
    ? request.headers.authorization.slice(7)
    : "";
  const provided = (Array.isArray(headerKey) ? headerKey[0] : headerKey) ?? bearer;
  return Boolean(expected) && secureEquals(provided ?? "", expected);
}

function slugify(keyword: string): string {
  const normalized = keyword
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 220)
    .replace(/-+$/g, "");

  if (normalized) return normalized;
  return `entity-${createHash("sha256").update(keyword).digest("hex").slice(0, 16)}`;
}

function normalizedKeyword(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

function requestHash(body: BatchPayload): string {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

async function mapLimit<T, R>(items: readonly T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const runner = async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item === undefined) return;
      results[index] = await worker(item);
    }
  };

  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, () => runner()));
  return results;
}

async function claimRun(db: Pool, key: string, hash: string): Promise<Record<string, unknown> | null> {
  const inserted = await db.query(
    `INSERT INTO pseo_batch_runs (idempotency_key, request_hash, status)
     VALUES ($1, $2, 'processing')
     ON CONFLICT (idempotency_key) DO NOTHING
     RETURNING idempotency_key`,
    [key, hash],
  );

  if (inserted.rowCount === 1) return null;

  const existingResult = await db.query<StoredRun>(
    `SELECT request_hash, status, response_payload
     FROM pseo_batch_runs
     WHERE idempotency_key = $1
     LIMIT 1`,
    [key],
  );
  const existing = existingResult.rows[0];
  if (!existing) throw new RouteError(409, "idempotency_race", "Unable to claim idempotency key");
  if (existing.request_hash !== hash) {
    throw new RouteError(409, "idempotency_conflict", "Idempotency key was already used with a different payload");
  }
  if (existing.status === "completed" && existing.response_payload) return existing.response_payload;
  if (existing.status === "processing") {
    throw new RouteError(409, "batch_in_progress", "A batch with this idempotency key is already processing");
  }

  await db.query(
    `UPDATE pseo_batch_runs
     SET status = 'processing', error_message = NULL, response_payload = NULL, updated_at = NOW()
     WHERE idempotency_key = $1`,
    [key],
  );
  return null;
}

async function completeRun(db: Pool, key: string, payload: Record<string, unknown>): Promise<void> {
  await db.query(
    `UPDATE pseo_batch_runs
     SET status = 'completed', response_payload = $2::jsonb, error_message = NULL, updated_at = NOW()
     WHERE idempotency_key = $1`,
    [key, JSON.stringify(payload)],
  );
}

async function failRun(db: Pool, key: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message.slice(0, 2000) : "Unknown batch failure";
  await db.query(
    `UPDATE pseo_batch_runs
     SET status = 'failed', error_message = $2, updated_at = NOW()
     WHERE idempotency_key = $1`,
    [key, message],
  ).catch(() => undefined);
}

const upsertEntitySql = `
  INSERT INTO pseo_entities (
    slug, primary_keyword, entity_category, attributes, ai_summary, is_indexed, updated_at
  )
  VALUES ($1, $2, $3, $4::jsonb, $5, FALSE, NOW())
  ON CONFLICT (slug) DO UPDATE SET
    primary_keyword = EXCLUDED.primary_keyword,
    entity_category = EXCLUDED.entity_category,
    attributes = pseo_entities.attributes || EXCLUDED.attributes,
    ai_summary = CASE
      WHEN EXCLUDED.ai_summary <> '' THEN EXCLUDED.ai_summary
      ELSE pseo_entities.ai_summary
    END,
    is_indexed = FALSE,
    updated_at = NOW()
  RETURNING id, slug, primary_keyword, entity_category, attributes,
            ai_summary, is_indexed, updated_at
`;

const bodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    workflowRunId: { type: "string", minLength: 1, maxLength: 160 },
    source: { type: "string", minLength: 1, maxLength: 80 },
    items: {
      type: "array",
      minItems: 1,
      maxItems: 50,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["targetKeyword", "category"],
        properties: {
          targetKeyword: { type: "string", minLength: 2, maxLength: 255 },
          category: { type: "string", minLength: 1, maxLength: 120 },
          aiSummary: { type: "string", maxLength: 12000 },
          technicalOverview: { type: "string", maxLength: 16000 },
          searchVolume: { type: "number", minimum: 0 },
          cpc: { type: "number", minimum: 0 },
          competition: { type: ["string", "null"], enum: ["LOW", "MEDIUM", "HIGH", null] },
          competitionIndex: { type: ["number", "null"], minimum: 0, maximum: 100 },
        },
      },
    },
    options: {
      type: "object",
      additionalProperties: false,
      properties: {
        enrichMetrics: { type: "boolean" },
        generateContent: { type: "boolean" },
        publish: { type: "boolean" },
        dispatchIndexNow: { type: "boolean" },
        includeGeneratedPages: { type: "boolean" },
      },
    },
  },
} as const;

export const pseoBatchRoutes: FastifyPluginAsync<PseoBatchRouteOptions> = async (fastify, options) => {
  const routeConfig = {
    schema: { body: bodySchema },
    preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
      if (!authorized(request, options.internalApiKey)) {
        return reply.code(401).send({ ok: false, error: "unauthorized" });
      }
    },
  };

  const handler = async (request: FastifyRequest<{ Body: BatchPayload }>, reply: FastifyReply) => {
    reply.header("Cache-Control", "private, no-store");
    reply.header("X-Content-Type-Options", "nosniff");

    const idempotencyHeader = request.headers["x-idempotency-key"];
    const idempotencyKey = (
      (Array.isArray(idempotencyHeader) ? idempotencyHeader[0] : idempotencyHeader) ??
      request.body.workflowRunId ??
      ""
    ).trim();

    if (!idempotencyKey || idempotencyKey.length > 160) {
      return reply.code(400).send({
        ok: false,
        error: "idempotency_key_required",
        message: "Send x-idempotency-key or workflowRunId for safe n8n/Make retries.",
      });
    }

    const hash = requestHash(request.body);
    let claimed = false;

    try {
      const replay = await claimRun(options.db, idempotencyKey, hash);
      if (replay) return reply.code(200).send({ ...replay, replayed: true });
      claimed = true;

      const source = request.body.source?.trim() || "n8n";
      const enrichMetrics = request.body.options?.enrichMetrics ?? true;
      const generateContent = request.body.options?.generateContent ?? true;
      const publish = request.body.options?.publish ?? false;
      const shouldDispatchIndexNow = request.body.options?.dispatchIndexNow ?? publish;
      const includeGeneratedPages = request.body.options?.includeGeneratedPages ?? !publish;

      const slugs = request.body.items.map((item) => slugify(item.targetKeyword));
      if (new Set(slugs).size !== slugs.length) {
        throw new RouteError(409, "duplicate_slug", "Two or more batch keywords normalize to the same slug");
      }

      const needsMetrics = request.body.items.filter(
        (item) => item.searchVolume === undefined || item.cpc === undefined || item.competitionIndex === undefined,
      );
      const metricMap = new Map<string, Awaited<ReturnType<typeof fetchLiveSearchMetrics>>[number]>();

      if (enrichMetrics && needsMetrics.length > 0) {
        if (!options.dataForSeoLogin || !options.dataForSeoPassword) {
          throw new RouteError(503, "dataforseo_not_configured", "DataForSEO credentials are required for metric enrichment");
        }
        const metrics = await fetchLiveSearchMetrics(
          needsMetrics.map((item) => item.targetKeyword),
          {
            login: options.dataForSeoLogin,
            password: options.dataForSeoPassword,
            locationCode: 2840,
            languageCode: "en",
            timeoutMs: 20_000,
          },
        );
        for (const metric of metrics) metricMap.set(normalizedKeyword(metric.keyword), metric);
      }

      const prepared = await mapLimit(request.body.items, 4, async (item): Promise<PreparedItem> => {
        const metric = metricMap.get(normalizedKeyword(item.targetKeyword));
        const searchVolume = item.searchVolume ?? metric?.searchVolume ?? 0;
        const cpc = item.cpc ?? metric?.cpc ?? 0;
        const competition = item.competition ?? metric?.competition ?? null;
        const competitionIndex = item.competitionIndex ?? metric?.competitionIndex ?? null;
        let aiSummary = item.aiSummary?.trim() ?? "";
        let technicalOverview = item.technicalOverview?.trim() ?? "";

        if (generateContent && (!aiSummary || !technicalOverview)) {
          if (!options.openAiApiKey) {
            throw new RouteError(503, "openai_not_configured", "OPENAI_API_KEY is required for missing content");
          }
          const generated = await generateEntityContent(
            {
              targetKeyword: item.targetKeyword,
              category: item.category,
              searchVolume,
              cpc,
              competitionIndex,
            },
            {
              apiKey: options.openAiApiKey,
              model: options.openAiModel,
              timeoutMs: 35_000,
            },
          );
          if (!aiSummary) aiSummary = generated.aiSummary;
          if (!technicalOverview) technicalOverview = generated.technicalOverview;
        }

        if (publish && !aiSummary) {
          throw new RouteError(422, "content_not_ready", `No publishable summary for ${item.targetKeyword}`);
        }

        return {
          targetKeyword: item.targetKeyword.trim(),
          category: item.category.trim(),
          aiSummary,
          technicalOverview,
          searchVolume,
          cpc,
          competition,
          competitionIndex,
        };
      });

      const client = await options.db.connect();
      const rows: PseoEntityRow[] = [];
      try {
        await client.query("BEGIN");
        for (let index = 0; index < prepared.length; index += 1) {
          const item = prepared[index];
          const slug = slugs[index];
          if (!item || !slug) continue;

          const attributes = {
            searchVolume: item.searchVolume,
            cpc: item.cpc,
            competition: item.competition,
            competitionIndex: item.competitionIndex,
            technicalOverview: item.technicalOverview,
            metricSource: enrichMetrics ? "dataforseo-or-upstream" : "upstream",
            source,
            processedAt: new Date().toISOString(),
          };

          const result = await client.query<PseoEntityRow>(upsertEntitySql, [
            slug,
            item.targetKeyword,
            item.category,
            JSON.stringify(attributes),
            item.aiSummary,
          ]);
          const row = result.rows[0];
          if (row) rows.push(row);
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }

      const pages: GeneratedPagePayload[] = rows
        .filter((row) => row.ai_summary.trim().length > 0)
        .map((row) => renderPseoPage(row, options.publicSiteUrl, options.pathPrefix));

      const warnings: string[] = [];
      let publishedUrls: string[] = [];
      let verifiedUrls: string[] = [];
      let verificationFailed: Array<{ url: string; status: number }> = [];
      let indexNowSubmitted = 0;

      if (publish) {
        if (!options.edgeIngestUrl || !options.edgeIngestApiKey) {
          throw new RouteError(503, "edge_publisher_not_configured", "EDGE_INGEST_URL and EDGE_INGEST_API_KEY are required when publish=true");
        }

        const publishResult = await publishGeneratedPages(
          pages,
          {
            endpoint: options.edgeIngestUrl,
            apiKey: options.edgeIngestApiKey,
            timeoutMs: 20_000,
          },
          idempotencyKey,
        );
        publishedUrls = publishResult.publishedUrls;

        const verification = await verifyPublishedUrls(publishedUrls);
        verifiedUrls = verification.ready;
        verificationFailed = verification.failed;
        if (verificationFailed.length > 0) {
          warnings.push(`${verificationFailed.length} published URL(s) did not return a public 2xx response and were withheld from IndexNow.`);
        }
      } else if (shouldDispatchIndexNow) {
        warnings.push("IndexNow was skipped because publish=false. IndexNow is only dispatched after public URL verification.");
      }

      if (publish && shouldDispatchIndexNow && verifiedUrls.length > 0) {
        if (!options.indexNowKey || !options.indexNowHost) {
          warnings.push("IndexNow skipped because INDEXNOW_KEY or INDEXNOW_HOST is not configured.");
        } else {
          const indexResults = await dispatchIndexNowBatches(verifiedUrls, {
            host: options.indexNowHost,
            key: options.indexNowKey,
            ...(options.indexNowKeyLocation ? { keyLocation: options.indexNowKeyLocation } : {}),
          });
          indexNowSubmitted = indexResults.reduce((sum, result) => sum + result.submitted, 0);
        }
      }

      const responsePayload: Record<string, unknown> = {
        ok: true,
        status: verificationFailed.length > 0 ? "partial" : "success",
        idempotencyKey,
        processedCount: rows.length,
        generatedCount: pages.length,
        publishedCount: publishedUrls.length,
        verifiedCount: verifiedUrls.length,
        indexNowSubmitted,
        entities: rows.map((row) => ({ id: row.id, slug: row.slug, url: pages.find((page) => page.entity.id === row.id)?.seo.canonicalUrl ?? null })),
        warnings,
        ...(includeGeneratedPages ? { pages } : {}),
      };

      await completeRun(options.db, idempotencyKey, responsePayload);
      return reply.code(200).send(responsePayload);
    } catch (error) {
      if (claimed) await failRun(options.db, idempotencyKey, error);
      request.log.error({ err: error, idempotencyKey }, "pSEO batch pipeline failed");
      if (error instanceof RouteError) {
        return reply.code(error.statusCode).send({ ok: false, error: error.code, message: error.message });
      }
      return reply.code(500).send({ ok: false, error: "batch_pipeline_failed", message: "Batch processing failed" });
    }
  };

  fastify.post<{ Body: BatchPayload }>("/api/automation/sync-and-publish", routeConfig, handler);
  fastify.post<{ Body: BatchPayload }>("/api/internal/batch-sync", routeConfig, handler);
};

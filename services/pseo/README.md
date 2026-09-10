# BigSignal pSEO Service

Isolated Fastify + PostgreSQL service for programmatic SEO generation, enrichment, publishing orchestration, public verification, and IndexNow dispatch without adding runtime weight to the public Next.js application.

## Production flow

1. n8n / Make / Airtable / Whalesync sends a batch of up to 50 entities to `POST /api/automation/sync-and-publish`.
2. The service enforces internal API auth and an idempotency key so workflow retries cannot duplicate publication side effects.
3. Missing keyword metrics are enriched through DataForSEO in one live Google Ads search-volume task.
4. Missing content is generated with bounded concurrency through the OpenAI Responses API using strict structured output.
5. PostgreSQL entity upserts execute inside one short transaction. No external API calls are performed while the transaction is open.
6. Semantic page payloads are compiled with canonical metadata and JSON-LD.
7. When `publish=true`, the batch is sent to `EDGE_INGEST_URL` using the same idempotency key.
8. Canonical URLs are fetched publicly. Only URLs returning 2xx are eligible for IndexNow.
9. IndexNow is dispatched for verified URLs. `is_indexed` remains false until indexation is independently observed.

## Setup

```bash
cd services/pseo
cp .env.example .env
npm install
psql "$DATABASE_URL" -f db/schema.sql
npm run build
npm start
```

Or run the local production-like stack:

```bash
docker compose up --build -d
docker compose logs -f app
```

The root Next.js TypeScript config excludes `services/pseo`, so server-only dependencies do not affect the frontend Vercel deployment.

## Batch endpoint

Canonical route:

```text
POST /api/automation/sync-and-publish
```

Compatibility alias:

```text
POST /api/internal/batch-sync
```

Required headers:

```text
x-internal-api-key: <INTERNAL_API_KEY>
x-idempotency-key: <unique-workflow-run-and-batch-key>
```

`workflowRunId` can be used instead of the idempotency header. See `n8n/payload.example.json`.

Defaults:

- `enrichMetrics=true`
- `generateContent=true`
- `publish=false`
- `dispatchIndexNow` follows `publish`
- `includeGeneratedPages` is true when `publish=false`

This allows n8n to choose between two safe modes: backend-owned publication with `publish=true`, or orchestration-owned publication by receiving generated page payloads and publishing them in a later node.

## Single-entity endpoint

`POST /api/internal/generate-page` accepts `{ "entityId": 123 }` and returns one production `upsert` payload containing SEO metadata, semantic HTML, JSON-LD, and the canonical URL.

## DataForSEO

`src/services/dataforseo.ts` uses `keywords_data/google_ads/search_volume/live` with one task containing a `keywords` array, United States location code `2840`, and English language code `en`.

The stored `competition` and `competitionIndex` fields are Google Ads paid-search competition metrics. They must not be described as organic SEO keyword difficulty. If organic difficulty is needed later, add a dedicated DataForSEO Labs/SERP-derived metric rather than relabeling Google Ads competition.

## OpenAI content generation

`src/services/content.ts` uses the OpenAI Responses API with Structured Outputs. The model is configurable with `OPENAI_MODEL`; the default is `gpt-5.6-terra` for a quality/cost balance. Generation is limited to four concurrent items per batch and validates minimum content depth before database persistence.

The generator is instructed not to fabricate product capabilities, fake firsthand experience, or reinterpret paid-search metrics as organic ranking difficulty.

## Edge publisher contract

When `publish=true`, configure:

```text
EDGE_INGEST_URL
EDGE_INGEST_API_KEY
```

The endpoint receives:

```json
{
  "version": 1,
  "operation": "upsert_batch",
  "source": "bigsignal-pseo",
  "pages": []
}
```

It must return 2xx only after the page payloads have been persisted or made available to the public serving layer. The pSEO service then independently verifies the canonical URLs before IndexNow.

## IndexNow

`src/services/indexnow.ts` validates host ownership, deduplicates URLs, supports up to 10,000 URLs per request, uses timeouts, and retries transient rate-limit/server failures.

The verification key must be publicly reachable at `INDEXNOW_KEY_LOCATION` before dispatching. IndexNow accelerates discovery; it does not guarantee crawling, ranking, or indexation.

## n8n

See `n8n/README.md` and `n8n/payload.example.json` for the control-plane sequence. The recommended batch size is 50 and every batch must receive a stable idempotency key.

## Quality guardrails

Scale only entities that have distinct search intent and materially useful content. Avoid thin location/keyword permutations, near-duplicate doorway pages, fabricated claims, and pages created solely to manipulate rankings. Sustainable indexation still depends on internal linking, sitemap coverage, crawlability, canonical consistency, page quality, site reputation, and actual user value.

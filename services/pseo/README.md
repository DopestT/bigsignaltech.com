# BigSignal pSEO Service

Isolated Fastify + PostgreSQL service for generating structured pSEO page payloads without adding runtime weight to the public Next.js application.

## Flow

1. An upstream workflow (n8n, Make.com, importer, or admin job) creates/updates a `pseo_entities` row.
2. The workflow calls `POST /api/internal/generate-page` with `{ "entityId": 123 }` and `x-internal-api-key`.
3. Fastify returns an `upsert` payload containing canonical SEO metadata, semantic article HTML, JSON-LD, and `workflow.indexNowUrls`.
4. The edge/static publisher persists the page and makes the canonical URL publicly fetchable.
5. Only after publishing succeeds, call `dispatchIndexNowBatches(workflow.indexNowUrls, config)` from the publishing worker. This prevents notifying search engines about URLs that do not exist yet.

## Setup

```bash
cd services/pseo
cp .env.example .env
npm install
psql "$DATABASE_URL" -f db/schema.sql
npm run build
npm start
```

The root Next.js TypeScript config excludes this service so its server dependencies do not affect the frontend deployment.

## Internal generation request

```json
{
  "entityId": 123
}
```

Required header:

```text
x-internal-api-key: <INTERNAL_API_KEY>
```

Example successful response shape (n8n / Make friendly):

```json
{
  "ok": true,
  "version": 1,
  "operation": "upsert",
  "entity": {
    "id": 123,
    "slug": "example-tool",
    "category": "software",
    "updatedAt": "2026-09-10T20:00:00.000Z"
  },
  "seo": {
    "title": "Example Tool",
    "description": "...",
    "canonicalUrl": "https://bigsignaltech.com/tools/example-tool",
    "primaryKeyword": "example tool",
    "entityCategory": "software"
  },
  "content": {
    "html": "<article>...</article>",
    "jsonLd": {},
    "jsonLdScript": "<script type=\"application/ld+json\">...</script>"
  },
  "workflow": {
    "source": "bigsignal-pseo",
    "indexNowUrls": ["https://bigsignaltech.com/tools/example-tool"]
  },
  "generatedAt": "2026-09-10T20:00:01.000Z"
}
```

## n8n / Make.com orchestration

Use this order for every generation batch:

- DB upsert -> Fastify generate-page -> edge/static publish -> HTTP verification (200) -> IndexNow dispatch.
- Batch entities by category and update time. Keep generation idempotent: the entity `slug` is the stable public key and `operation` is always `upsert`.
- Retry generation/publishing on transient failures. Do not retry 401, 404, or 422 without fixing input data.
- Never mark `is_indexed=true` solely because IndexNow accepted a URL. IndexNow submission is discovery notification, not proof of search-engine indexation.

## IndexNow

`src/services/indexnow.ts` validates that every submitted URL belongs to `INDEXNOW_HOST`, deduplicates URLs, batches at 10,000 URLs/request, times out stalled requests, and retries only rate-limit/server failures.

Your key must be publicly available at `INDEXNOW_KEY_LOCATION` (normally `https://<host>/<key>.txt`) before dispatching.

## Quality / indexation guardrails

The generator rejects entities with an empty `ai_summary` (422). Keep each page genuinely useful and entity-specific; avoid near-duplicate doorway pages. Indexation at scale depends on crawlable internal linking, canonical consistency, sitemap coverage, page quality, and real user value in addition to IndexNow.

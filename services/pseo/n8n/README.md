# n8n pSEO orchestration

Use n8n as the control plane and keep expensive enrichment/generation work in bounded backend calls.

## Recommended workflow

1. **Schedule Trigger / Airtable webhook** — select rows whose status is `Ready`.
2. **Code: normalize + chunk** — deduplicate keywords and split into batches of at most 50.
3. **Optional DataForSEO HTTP node** — enrich upstream if you want n8n to own DataForSEO. If omitted, Fastify fills missing metrics when `options.enrichMetrics=true`.
4. **HTTP: BigSignal pSEO** — `POST /api/automation/sync-and-publish` with `x-internal-api-key` and a unique `x-idempotency-key` such as `{{$execution.id}}:{{$runIndex}}`.
5. **IF status** — treat `200` as accepted, `409 batch_in_progress` as retryable after delay, and other 4xx responses as input/configuration errors.
6. **Publisher path** — either set `options.publish=true` and configure `EDGE_INGEST_URL`, or set `publish=false`, ingest the returned `pages` in n8n, verify each canonical URL returns 2xx, then invoke your indexing stage.
7. **Error workflow** — capture node name, execution ID, HTTP status, and sanitized error code; send a Telegram alert without API keys or request authorization headers.

## Fastify request contract

Use `payload.example.json` as the body template. The route supports both `/api/automation/sync-and-publish` and `/api/internal/batch-sync`.

The backend provides:

- idempotency for safe n8n/Make retries;
- optional DataForSEO enrichment for missing metrics;
- bounded-concurrency OpenAI content generation for missing content;
- one atomic PostgreSQL transaction for the batch upserts;
- semantic page compilation after commit;
- optional edge publishing;
- public HTTP verification before IndexNow dispatch.

## Important sequencing

Never hold a PostgreSQL transaction open while waiting on DataForSEO, OpenAI, an edge publisher, or IndexNow. External calls occur before or after the short database transaction.

Never set `is_indexed=true` because IndexNow accepted a URL. IndexNow is a discovery notification, not proof that a search engine indexed the page.

## DataForSEO

The backend uses the Google Ads Search Volume Live endpoint with one task containing a `keywords` array. `competition` and `competitionIndex` are paid-ad competition signals; do not label them as organic keyword difficulty.

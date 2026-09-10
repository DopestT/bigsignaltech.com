import Fastify from "fastify";
import { createDbPool } from "./db.js";
import { pseoRoutes } from "./routes/pseo.js";
import { pseoBatchRoutes } from "./routes/pseoBatch.js";

const databaseUrl = process.env.DATABASE_URL ?? "";
const internalApiKey = process.env.INTERNAL_API_KEY ?? "";
const publicSiteUrl = process.env.PUBLIC_SITE_URL ?? "https://bigsignaltech.com";
const pathPrefix = process.env.PSEO_PATH_PREFIX ?? "/tools";
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

if (!databaseUrl) throw new Error("DATABASE_URL is required");
if (!internalApiKey) throw new Error("INTERNAL_API_KEY is required");

const db = createDbPool(databaseUrl);
const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.x-internal-api-key",
        "req.headers.x-idempotency-key",
      ],
      censor: "[REDACTED]",
    },
  },
  bodyLimit: 256 * 1024,
  requestTimeout: 120_000,
  keepAliveTimeout: 72_000,
});

app.get("/health", async () => {
  await db.query("SELECT 1");
  return { ok: true };
});

await app.register(pseoRoutes, {
  db,
  internalApiKey,
  publicSiteUrl,
  pathPrefix,
});

await app.register(pseoBatchRoutes, {
  db,
  internalApiKey,
  publicSiteUrl,
  pathPrefix,
  dataForSeoLogin: process.env.DATAFORSEO_LOGIN ?? "",
  dataForSeoPassword: process.env.DATAFORSEO_PASSWORD ?? "",
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-5.6-terra",
  edgeIngestUrl: process.env.EDGE_INGEST_URL ?? "",
  edgeIngestApiKey: process.env.EDGE_INGEST_API_KEY ?? "",
  indexNowHost: process.env.INDEXNOW_HOST ?? "bigsignaltech.com",
  indexNowKey: process.env.INDEXNOW_KEY ?? "",
  indexNowKeyLocation: process.env.INDEXNOW_KEY_LOCATION ?? "",
});

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "shutting down");
  await app.close();
  await db.end();
  process.exit(0);
};

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  await db.end();
  process.exit(1);
}

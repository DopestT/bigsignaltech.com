import Fastify from "fastify";
import { pseoRoutes } from "./routes/pseo.js";
import { pseoBatchRoutes } from "./routes/pseoBatch.js";
import { SupabasePseoStore } from "./store.js";

const internalApiKey = process.env.INTERNAL_API_KEY ?? "";
const publicSiteUrl = process.env.PUBLIC_SITE_URL ?? "https://bigsignaltech.com";
const pathPrefix = process.env.PSEO_PATH_PREFIX ?? "/tools";
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

if (!internalApiKey) throw new Error("INTERNAL_API_KEY is required");

const store = new SupabasePseoStore({
  url: process.env.SUPABASE_URL ?? "",
  anonKey: process.env.SUPABASE_ANON_KEY ?? "",
  token: process.env.PSEO_DB_TOKEN ?? "",
  timeoutMs: 10_000,
});

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

app.get("/health", async (_request, reply) => {
  try {
    const ok = await store.health();
    if (!ok) return reply.code(503).send({ ok: false, store: "unavailable" });
    return reply.code(200).send({ ok: true, store: "perception" });
  } catch (error) {
    app.log.error({ err: error }, "Perception pSEO store health check failed");
    return reply.code(503).send({ ok: false, store: "unavailable" });
  }
});

await app.register(pseoRoutes, {
  store,
  internalApiKey,
  publicSiteUrl,
  pathPrefix,
});

await app.register(pseoBatchRoutes, {
  store,
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
  process.exit(0);
};

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

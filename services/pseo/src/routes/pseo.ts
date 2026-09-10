import { timingSafeEqual } from "node:crypto";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import type { PseoStore } from "../store.js";
import { renderPseoPage } from "../templates/render.js";

interface PseoRouteOptions {
  store: PseoStore;
  internalApiKey: string;
  publicSiteUrl: string;
  pathPrefix: string;
}

interface GeneratePageBody {
  entityId: number;
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
    : undefined;
  const provided = (Array.isArray(headerKey) ? headerKey[0] : headerKey) ?? bearer ?? "";
  return Boolean(expected) && secureEquals(provided, expected);
}

export const pseoRoutes: FastifyPluginAsync<PseoRouteOptions> = async (fastify, options) => {
  if (!options.internalApiKey) throw new Error("INTERNAL_API_KEY is required");

  fastify.post<{ Body: GeneratePageBody }>(
    "/api/internal/generate-page",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["entityId"],
          properties: {
            entityId: { type: "integer", minimum: 1 },
          },
        },
      },
      preHandler: async (request, reply) => {
        if (!authorized(request, options.internalApiKey)) {
          return reply.code(401).send({ ok: false, error: "unauthorized" });
        }
      },
    },
    async (request, reply) => {
      reply.header("Cache-Control", "private, no-store");
      reply.header("X-Content-Type-Options", "nosniff");

      try {
        const entity = await options.store.getEntityById(request.body.entityId);

        if (!entity) {
          return reply.code(404).send({
            ok: false,
            error: "entity_not_found",
            entityId: request.body.entityId,
          });
        }

        if (!entity.ai_summary.trim()) {
          return reply.code(422).send({
            ok: false,
            error: "entity_not_ready",
            message: "ai_summary must contain substantive page context before generation.",
            entityId: entity.id,
          });
        }

        const page = renderPseoPage(entity, options.publicSiteUrl, options.pathPrefix);
        return reply.code(200).send({ ok: true, ...page });
      } catch (error) {
        request.log.error({ err: error, entityId: request.body.entityId }, "pSEO page generation failed");
        return reply.code(500).send({ ok: false, error: "generation_failed" });
      }
    },
  );

  fastify.get("/api/public/slugs", async (request, reply) => {
    reply.header("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=86400");
    reply.header("X-Content-Type-Options", "nosniff");

    try {
      const entities = await options.store.listEntities();
      return reply.code(200).send({ ok: true, count: entities.length, entities });
    } catch (error) {
      request.log.error({ err: error }, "public pSEO slug catalog read failed");
      return reply.code(500).send({ ok: false, error: "catalog_read_failed" });
    }
  });

  fastify.get<{ Params: { slug: string } }>(
    "/api/public/page/:slug",
    {
      schema: {
        params: {
          type: "object",
          additionalProperties: false,
          required: ["slug"],
          properties: {
            slug: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$", maxLength: 255 },
          },
        },
      },
    },
    async (request, reply) => {
      reply.header("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=86400");
      reply.header("X-Content-Type-Options", "nosniff");

      try {
        const entity = await options.store.getEntityBySlug(request.params.slug);
        if (!entity || !entity.ai_summary.trim()) {
          return reply.code(404).send({ ok: false, error: "page_not_found" });
        }

        const page = renderPseoPage(entity, options.publicSiteUrl, options.pathPrefix);
        return reply.code(200).send({ ok: true, ...page });
      } catch (error) {
        request.log.error({ err: error, slug: request.params.slug }, "public pSEO page read failed");
        return reply.code(500).send({ ok: false, error: "page_read_failed" });
      }
    },
  );
};

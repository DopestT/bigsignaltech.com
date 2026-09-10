import { timingSafeEqual } from "node:crypto";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import type { Pool } from "pg";
import { renderPseoPage } from "../templates/render.js";
import type { PseoEntityRow } from "../types/pseo.js";

interface PseoRouteOptions {
  db: Pool;
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

const selectEntity = {
  name: "pseo-entity-by-id-v1",
  text: `
    SELECT id, slug, primary_keyword, entity_category, attributes,
           ai_summary, is_indexed, updated_at
    FROM pseo_entities
    WHERE id = $1
    LIMIT 1
  `,
};

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
        const result = await options.db.query<PseoEntityRow>({
          ...selectEntity,
          values: [request.body.entityId],
        });
        const entity = result.rows[0];

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
};

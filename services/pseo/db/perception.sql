-- BigSignal pSEO -> Perception ownership bridge.
-- Run only against the shared Perception PostgreSQL data plane after db/schema.sql.
-- Perception remains authoritative; the Fastify worker is an execution surface.

DO $$
DECLARE
  project_uuid UUID;
BEGIN
  SELECT id
  INTO project_uuid
  FROM public.perception_projects
  WHERE name = 'BigSignal Tools — pSEO Growth Engine'
    AND active = TRUE
  ORDER BY created_at DESC
  LIMIT 1;

  IF project_uuid IS NULL THEN
    RAISE EXCEPTION 'Active Perception project "BigSignal Tools — pSEO Growth Engine" not found';
  END IF;

  ALTER TABLE public.pseo_entities
    ADD COLUMN IF NOT EXISTS perception_project_id UUID;
  ALTER TABLE public.pseo_batch_runs
    ADD COLUMN IF NOT EXISTS perception_project_id UUID;

  UPDATE public.pseo_entities
  SET perception_project_id = project_uuid
  WHERE perception_project_id IS NULL;

  UPDATE public.pseo_batch_runs
  SET perception_project_id = project_uuid
  WHERE perception_project_id IS NULL;

  EXECUTE format(
    'ALTER TABLE public.pseo_entities ALTER COLUMN perception_project_id SET DEFAULT %L::uuid',
    project_uuid::text
  );
  EXECUTE format(
    'ALTER TABLE public.pseo_batch_runs ALTER COLUMN perception_project_id SET DEFAULT %L::uuid',
    project_uuid::text
  );

  ALTER TABLE public.pseo_entities
    ALTER COLUMN perception_project_id SET NOT NULL;
  ALTER TABLE public.pseo_batch_runs
    ALTER COLUMN perception_project_id SET NOT NULL;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pseo_entities_perception_project_fk'
  ) THEN
    ALTER TABLE public.pseo_entities
      ADD CONSTRAINT pseo_entities_perception_project_fk
      FOREIGN KEY (perception_project_id)
      REFERENCES public.perception_projects(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pseo_batch_runs_perception_project_fk'
  ) THEN
    ALTER TABLE public.pseo_batch_runs
      ADD CONSTRAINT pseo_batch_runs_perception_project_fk
      FOREIGN KEY (perception_project_id)
      REFERENCES public.perception_projects(id)
      ON DELETE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS ix_pseo_entities_project
  ON public.pseo_entities (perception_project_id);
CREATE INDEX IF NOT EXISTS ix_pseo_batch_runs_project
  ON public.pseo_batch_runs (perception_project_id);

COMMENT ON COLUMN public.pseo_entities.perception_project_id IS
'Authoritative Perception project that owns this pSEO entity.';
COMMENT ON TABLE public.pseo_entities IS
'BigSignal pSEO entities. Ownership and lifecycle are subordinate to Perception.';
COMMENT ON TABLE public.pseo_batch_runs IS
'BigSignal pSEO idempotency ledger. Ownership and lifecycle are subordinate to Perception.';

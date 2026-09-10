CREATE TABLE IF NOT EXISTS pseo_entities (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(255) NOT NULL,
    primary_keyword VARCHAR(255) NOT NULL,
    entity_category VARCHAR(120) NOT NULL,
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    ai_summary TEXT NOT NULL DEFAULT '',
    is_indexed BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT pseo_entities_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    CONSTRAINT pseo_entities_attributes_object CHECK (jsonb_typeof(attributes) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_pseo_entities_slug
    ON pseo_entities (slug);

CREATE INDEX IF NOT EXISTS ix_pseo_entities_category
    ON pseo_entities (entity_category);

CREATE INDEX IF NOT EXISTS ix_pseo_entities_category_updated
    ON pseo_entities (entity_category, updated_at DESC);

CREATE INDEX IF NOT EXISTS ix_pseo_entities_not_indexed
    ON pseo_entities (updated_at DESC)
    WHERE is_indexed = FALSE;

CREATE INDEX IF NOT EXISTS ix_pseo_entities_attributes_gin
    ON pseo_entities USING GIN (attributes jsonb_path_ops);

CREATE TABLE IF NOT EXISTS pseo_batch_runs (
    idempotency_key VARCHAR(160) PRIMARY KEY,
    request_hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'processing',
    response_payload JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT pseo_batch_runs_status CHECK (status IN ('processing', 'completed', 'failed')),
    CONSTRAINT pseo_batch_runs_request_hash CHECK (request_hash ~ '^[a-f0-9]{64}$')
);

CREATE INDEX IF NOT EXISTS ix_pseo_batch_runs_status_updated
    ON pseo_batch_runs (status, updated_at DESC);

CREATE OR REPLACE FUNCTION touch_pseo_entity_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pseo_entities_updated_at ON pseo_entities;
CREATE TRIGGER trg_pseo_entities_updated_at
BEFORE UPDATE ON pseo_entities
FOR EACH ROW
EXECUTE FUNCTION touch_pseo_entity_updated_at();

COMMENT ON COLUMN pseo_entities.is_indexed IS
'Only set true after indexing is independently verified; an IndexNow submission alone does not prove indexation.';

COMMENT ON TABLE pseo_batch_runs IS
'Idempotency ledger for n8n/Make retries. A completed response can be safely replayed without duplicate publication side effects.';

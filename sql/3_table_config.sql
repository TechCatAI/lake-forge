-- LakeForge DDL Schemas
-- database: lakeforge_db
-- schema: mdf_app
-- table_config: Know what to ingest and where it lives
CREATE TABLE mdf_app.table_config (
    id              SERIAL PRIMARY KEY,
	-- TABLE ⇢ GROUP (N-to-1)  – each table in ≤ 1 group for now ------------
	group_id INT REFERENCES mdf_app."group"(id),
    -- what & where ---------------------------------------------------------
    source_kind     TEXT NOT NULL   CHECK (source_kind IN ('volume','external','jdbc')),
    source_system       TEXT NOT NULL,
    catalog             TEXT NOT NULL, 
    schema_name         TEXT NOT NULL, 
    table_name          TEXT NOT NULL, 
    is_enabled          BOOLEAN                DEFAULT false,
    source_path     TEXT NOT NULL,               -- path or catalog.schema.tbl
    file_format     TEXT,                        -- e.g., parquet, csv (for volume)
    connection_id   INT REFERENCES mdf_app.connection(id),  -- jdbc only
    -- ingestion behaviour --------------------------------------------------
    load_type       TEXT NOT NULL   CHECK (load_type IN ('full','incremental')),
    pk_columns      TEXT[]        NOT NULL,      -- ARRAY['id','date']
    ingest_options  JSONB         NOT NULL DEFAULT '{}'::jsonb,
    quarantine      BOOLEAN                DEFAULT false,
    -- bookkeeping ----------------------------------------------------------
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT current_timestamp,
    created_by      TEXT          NOT NULL,
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT current_timestamp,
    updated_by      TEXT          NOT NULL
);

CREATE UNIQUE INDEX uq_table_path
          ON mdf_app.table_config(source_kind, source_path);

-- optional helper view
CREATE OR REPLACE VIEW mdf_app.vw_table_with_group AS
SELECT tc.*,
       g.name AS group_name
FROM   mdf_app.table_config tc
LEFT   JOIN mdf_app."group" g ON g.id = tc.group_id;

------

/* ────────────────────────────────────────────────────────────────
  TABLE ⇢ GROUP (N-to-1)  – each table in ≤ 1 group for now
  Link every table_config row to *at most one* group for now.
  If you later allow many-to-many, drop the UNIQUE and add a PK.
────────────────────────────────────────────────────────────────────*/
CREATE TABLE mdf_app.table_group (
    table_config_id INT PRIMARY KEY
                       REFERENCES mdf_app.table_config(id)
                       ON DELETE CASCADE,
    group_id        INT NOT NULL
                       REFERENCES mdf_app."group"(id)
                       ON DELETE CASCADE,
    -- bookkeeping
    created_at      TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    created_by      TEXT        NOT NULL DEFAULT current_user
);
COMMENT ON TABLE  mdf_app.table_group IS 'Assigns each table_config row to one ingestion group';
COMMENT ON COLUMN mdf_app.table_group.table_config_id IS 'FK to the metadata about the source table';
COMMENT ON COLUMN mdf_app.table_group.group_id IS 'FK to mdf_app.group; determines scheduling';

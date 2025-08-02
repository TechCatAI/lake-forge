-- SELECT version();
/*======================================================================
  Lake-Forge monolith schema bootstrap 2025-07-19
======================================================================*/
/*======================================================================
  1.  DB and Schema OBJECTS  (executed in databricks sql editor, but show here for reference)
======================================================================*/
-- -- 0.0 create & connect to DB
-- CREATE DATABASE lakeforge_db;

-- -----------------------------------------------------------------------
-- -- 0.1  SCHEMA namespace
-- -----------------------------------------------------------------------
-- CREATE SCHEMA IF NOT EXISTS mdf_app;
-- COMMENT ON SCHEMA mdf_app IS 'Schema for Lake-Forge tables';

-- **set the context to the mdf_app schema**
SET search_path TO mdf_app;

/*======================================================================
  1.  ENUM TYPES  (used by logging & config)
======================================================================*/
CREATE TYPE run_status   AS ENUM ('running','success','warning','failed','skipped');
CREATE TYPE trigger_type AS ENUM ('manual','schedule','adf','api');

/*======================================================================
  2.  CORE LOOK-UPS
======================================================================*/
-----------------------------------------------------------------------
-- 2.1  Connection registry 
-----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS connection (
    id            SERIAL PRIMARY KEY,
    name          TEXT UNIQUE NOT NULL,
    jdbc_url      TEXT,
    secret_scope  TEXT,
    secret_key    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    created_by    TEXT        NOT NULL DEFAULT current_user,
	updated_at    TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    updated_by    TEXT        NOT NULL DEFAULT current_user
);

-----------------------------------------------------------------------
-- 2.2  Source-system registry   (NEW)
-----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS source_system (
    id          SERIAL PRIMARY KEY,
    name        TEXT UNIQUE NOT NULL,             -- 'Salesforce-PROD'
    server      TEXT NOT NULL,                    -- jdbc / s3 bucket / api url
    description TEXT,
    type        TEXT NOT NULL CHECK (type IN ('adls','databricks','sql','restapi')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    created_by  TEXT        NOT NULL DEFAULT current_user,
	updated_at  TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    updated_by  TEXT        NOT NULL DEFAULT current_user
);

-----------------------------------------------------------------------
-- 2.3  Zone dimension          (NEW)
-----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS zone (
    id            SMALLINT PRIMARY KEY,
    zone          TEXT    UNIQUE NOT NULL,
    process_order SMALLINT UNIQUE NOT NULL
);

INSERT INTO zone (id,zone,process_order) VALUES
    (1,'raw',1),(2,'bronze',2),(3,'silver',3),(4,'gold',4)
ON CONFLICT (id) DO NOTHING;

-----------------------------------------------------------------------
-- 2.4  Group / Schedule tables
-----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedule (
    id		     SERIAL PRIMARY KEY,
    name         TEXT UNIQUE NOT NULL,
    description  TEXT,
    days         SMALLINT[]  NOT NULL DEFAULT '{}',   -- Sunday-Saturday
    times        TIME[]      NOT NULL DEFAULT '{}',   -- ‘05:00’, ‘18:30’ …
    is_enabled   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    created_by   TEXT        NOT NULL DEFAULT current_user,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    updated_by   TEXT        NOT NULL DEFAULT current_user,
    CONSTRAINT   chk_days_range  CHECK (days <@ '{0,1,2,3,4,5,6}'::SMALLINT[]),
    CONSTRAINT   chk_times_not_empty CHECK (array_length(times,1) > 0)
);

CREATE TABLE IF NOT EXISTS "group" (
    id          SERIAL PRIMARY KEY,
    name        TEXT UNIQUE NOT NULL,
    description TEXT,
	is_enabled  BOOLEAN      NOT NULL DEFAULT TRUE,
    is_raw      BOOLEAN NOT NULL DEFAULT FALSE,
    is_bronze   BOOLEAN NOT NULL DEFAULT FALSE,
    schedule_id INT REFERENCES schedule(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    created_by  TEXT        NOT NULL DEFAULT current_user,
	updated_at  TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    updated_by  TEXT        NOT NULL DEFAULT current_user
);

CREATE TABLE mdf_app.group_schedule (
    group_id     INT NOT NULL REFERENCES mdf_app."group"(id) ON DELETE CASCADE,
    schedule_id  INT NOT NULL REFERENCES mdf_app.schedule(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, schedule_id)
);

/*======================================================================
  3.  CONFIG TABLES  (RAW & BRONZE)
======================================================================*/
-----------------------------------------------------------------------
-- 3.1  RAW CONFIG
-----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS raw_config (
    id              SERIAL PRIMARY KEY,
    group_id        INT REFERENCES "group"(id),
    source_system_id INT REFERENCES source_system(id),
    connection_id   INT REFERENCES connection(id),
    source_path     TEXT NOT NULL UNIQUE,
    ingestion_type  TEXT NOT NULL CHECK (ingestion_type IN ('databricks','adf','manual')),

    copy_options     JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_directory TEXT NOT NULL,
	file_format      TEXT,

    -- watermark fields
    watermark_col           TEXT,
    watermark               TIMESTAMPTZ,
    watermark_increment_sec INT,
    watermark_initial       TIMESTAMPTZ,

    is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    created_by      TEXT        NOT NULL DEFAULT current_user,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    updated_by      TEXT        NOT NULL DEFAULT current_user
);
CREATE INDEX IF NOT EXISTS ix_raw_group  ON raw_config(group_id);

-----------------------------------------------------------------------
-- 3.2  BRONZE CONFIG  
-----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bronze_config (
    id              SERIAL PRIMARY KEY,
    raw_config_id   INT NOT NULL UNIQUE REFERENCES raw_config(id) ON DELETE CASCADE,
    group_id        INT REFERENCES "group"(id),

    source_kind     TEXT NOT NULL CHECK (source_kind IN ('volume','external','jdbc')),
    catalog         TEXT NOT NULL,
    schema_name     TEXT NOT NULL,
    table_name      TEXT NOT NULL,
    connection_id   INT REFERENCES connection(id),

    load_type       TEXT NOT NULL CHECK (load_type IN ('full','incremental', 'append', 'mergedelete')),
    is_stream       BOOLEAN NOT NULL DEFAULT FALSE,

    pk_columns      TEXT[],
    partition_cols  TEXT[],
    zorder_cols     TEXT[],
    watermark_col   TEXT,
    scd_type        SMALLINT DEFAULT 0 CHECK (scd_type IN (0,1,2,3,6)),       
    ingest_options  JSONB NOT NULL DEFAULT '{}'::jsonb,
    quarantine      BOOLEAN NOT NULL DEFAULT FALSE,
    is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    created_by      TEXT        NOT NULL DEFAULT current_user,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    updated_by      TEXT        NOT NULL DEFAULT current_user,

    UNIQUE (catalog,schema_name,table_name)
);
CREATE INDEX IF NOT EXISTS ix_bronze_grp ON bronze_config(group_id);
COMMENT ON TABLE bronze_config IS 'Config for Raw → Bronze Delta ingestion.';

-- CREATE TABLE table_group (
--     bronze_config_id INT PRIMARY KEY REFERENCES mdf_app.bronze_config(id) ON DELETE CASCADE,
--     group_id        INT NOT NULL REFERENCES mdf_app."group"(id) ON DELETE CASCADE,
--     -- bookkeeping
--     created_at      TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
--     created_by      TEXT        NOT NULL DEFAULT current_user
-- );

-----------------------------------------------------------------------
-- 3.3  Data-quality rules
-----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dq_rule (
    id              SERIAL PRIMARY KEY,
    is_enabled      BOOLEAN DEFAULT false,
    bronze_config_id INT NOT NULL REFERENCES bronze_config(id) ON DELETE CASCADE,
    rule_name       TEXT NOT NULL,
    rule_sql        TEXT NOT NULL,
    severity        TEXT NOT NULL CHECK (severity IN ('warn','fail','drop')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    created_by      TEXT        NOT NULL DEFAULT current_user,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    updated_by      TEXT        NOT NULL DEFAULT current_user
);
CREATE INDEX idx_dq_rule_table ON dq_rule(bronze_config_id);

-----------------------------------------------------------------------
-- 3.4  Watermark Cache side table
-----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS watermark_cache (
    zone_id          SMALLINT NOT NULL REFERENCES zone(id),
    table_config_id  INT      NOT NULL,
    last_value       TIMESTAMPTZ,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    PRIMARY KEY (zone_id, table_config_id)
);

COMMENT ON TABLE watermark_cache IS 'Stores last successfully processed watermark per table, across all data layer zones';

-----------------------------------------------------------------------
-- 3.5  DDL Schema side table
-----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS table_schema_cache (
    table_config_id INT      NOT NULL,
    zone_id         SMALLINT NOT NULL REFERENCES zone(id),
    ddl             TEXT     NOT NULL,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    PRIMARY KEY (table_config_id, zone_id)
);

COMMENT ON TABLE table_schema_cache IS 'Stores last successfully processed schema per table, across all data layer zones';

/*======================================================================
  4.  LOGGING TABLES  (batch / zone / table / step / dq)
======================================================================*/
-----------------------------------------------------------------------
-- 4.1  batch_run (extended)
-----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS batch_run (
    id            UUID PRIMARY KEY,
    schedule_id   INT REFERENCES schedule(id) ON DELETE SET NULL,
    group_id      INT REFERENCES "group"(id) NOT NULL,
    started_at    TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    finished_at   TIMESTAMPTZ,
	status        run_status NOT NULL DEFAULT 'running',
    trigger_type  TEXT NOT NULL CHECK (trigger_type IN ('manual','schedule','adf','api')),
	batch_load_type TEXT NOT NULL DEFAULT 'manual' CHECK (batch_load_type IN ('full', 'manual', 'integration', 'failed')),
	schedule_pipeline_id TEXT,
    group_pipeline_id    TEXT,
    message       TEXT
);
CREATE INDEX ix_batch_run_started ON batch_run(started_at DESC);
COMMENT ON TABLE batch_run IS 'One record per pipeline trigger (group + schedule run).';

-----------------------------------------------------------------------
-- 4.2  zone_run
-----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS zone_run (
    id          UUID PRIMARY KEY,
    batch_id    UUID NOT NULL REFERENCES batch_run(id) ON DELETE CASCADE,
    zone_id     SMALLINT NOT NULL REFERENCES zone(id),
	zone        TEXT,
    started_at  TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    finished_at TIMESTAMPTZ,
    status      run_status NOT NULL DEFAULT 'running',
    message     TEXT
);

-----------------------------------------------------------------------
-- 4.3  table_run  (points to bronze_config)
-----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS table_run (
    id              UUID PRIMARY KEY,
    batch_id        UUID NOT NULL REFERENCES batch_run(id) ON DELETE CASCADE,
	zone_run_id     UUID REFERENCES zone_run(id) ON DELETE CASCADE,
	zone_id         SMALLINT REFERENCES zone(id) ON DELETE CASCADE,
    table_config_id INT NOT NULL REFERENCES bronze_config(id),
    started_at      TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    finished_at     TIMESTAMPTZ,
	stage			TEXT NOT NULL CHECK (stage in ('source_to_raw', 'raw_to_bronze','bronze_to_silver','silver_to_gold')),
    status          run_status NOT NULL DEFAULT 'running',
    row_ct_in       BIGINT,
    row_ct_out      BIGINT,
    message         TEXT
);

-----------------------------------------------------------------------
-- 4.4  step_run 
-----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS step_run (
    id          UUID PRIMARY KEY,
    table_run_id UUID NOT NULL REFERENCES table_run(id) ON DELETE CASCADE,
    notebook    TEXT NOT NULL,
    step        TEXT NOT NULL,
    started_at  TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    finished_at TIMESTAMPTZ,
    status      run_status NOT NULL DEFAULT 'running'
);

-----------------------------------------------------------------------
-- 4.5  dq_run
-----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dq_run (
    id            UUID PRIMARY KEY,
    table_run_id  UUID NOT NULL REFERENCES table_run(id) ON DELETE CASCADE,
    dq_rule_id    INT  NOT NULL REFERENCES dq_rule(id),
    run_at        TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    status        TEXT NOT NULL CHECK (status IN ('pass','warn','fail','drop')),
	passing_rows  BIGINT,
    failing_rows  BIGINT,
	dropped_rows  BIGINT,
    message       TEXT
);

/*======================================================================
  5. HELPER VIEW:  raw               (zone_id = 1 → RAW)
======================================================================*/
CREATE OR REPLACE VIEW vw_raw_extended AS
SELECT
       rc.id                  AS raw_config_id,
       rc.group_id,
       g.name                 AS group_name,

       rc.source_system_id,
       ss.name                AS source_name,
       ss.type                AS source_type,          -- adls / sql / restapi

       rc.connection_id,
       rc.source_path,
       rc.output_directory,
	   rc.file_format,

       rc.ingestion_type,                             -- databricks / adf / manual
       rc.copy_options        AS ingest_options,      -- JSONB

       rc.watermark_col,
       rc.watermark_increment_sec,
       rc.watermark_initial,
       wc.last_value          AS raw_last_wm_val,     -- last successful watermark

       rc.is_enabled
FROM   raw_config        rc
LEFT   JOIN source_system ss   ON ss.id = rc.source_system_id
LEFT   JOIN "group"      g     ON g.id  = rc.group_id
LEFT   JOIN watermark_cache wc ON wc.table_config_id = rc.id AND wc.zone_id = 1    -- RAW
WHERE  rc.is_enabled = True;

/*======================================================================
  5.  HELPER VIEW  (bronze + raw + source_system)
======================================================================*/
CREATE OR REPLACE VIEW vw_bronze_extended AS
SELECT b.raw_config_id,
	   b.id AS bronze_config_id,
	   r.group_id,
	   g.name AS group_name,
	   ss.name  AS raw_source_name,
       ss.type  AS raw_source_type,
	   b.source_kind,
	   r.output_directory AS source_path,
	   r.file_format,
	   b.ingest_options,
	   b.load_type,
	   b.catalog,
	   b.schema_name,
	   b.table_name,
	   b.pk_columns,
	   b.watermark_col,
	   b.is_stream,
	   b.quarantine,
	   b.partition_cols,
	   b.zorder_cols,
	   b.scd_type,
       wm.last_value AS bronze_last_wm_val,
	   tsc.ddl AS ddl_schema
FROM   bronze_config        b
LEFT   JOIN raw_config      r  ON r.id = b.raw_config_id
LEFT   JOIN source_system   ss ON ss.id = r.source_system_id
LEFT   JOIN "group"         g  ON g.id = r.group_id
LEFT   JOIN watermark_cache wm ON wm.table_config_id = b.id AND wm.zone_id = 2
LEFT   JOIN table_schema_cache tsc ON tsc.table_config_id = b.id AND tsc.zone_id = 2
WHERE b.is_enabled = True;

/*======================================================================
  6.  GRANTS / INDEXES  (add as needed)
======================================================================*/


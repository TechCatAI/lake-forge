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
    id              SERIAL PRIMARY KEY,
    name            TEXT UNIQUE NOT NULL,                 -- ‘Salesforce-PROD’, ‘Postgres-HR’
    conn_type       TEXT NOT NULL CHECK (conn_type IN ('jdbc','adls','s3','restapi')),
    driver_class    TEXT,           -- only for JDBC
    endpoint_url    TEXT,           -- JDBC URL, https://api.mycorp.com, abfss://…
    secret_scope    TEXT,           -- <scope> that holds creds
    secret_key      TEXT,           -- key in the above scope (token / pwd)
    options         JSONB NOT NULL DEFAULT '{}'::jsonb,   -- provider-specific knobs
    created_at      TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    created_by      TEXT NOT NULL  DEFAULT current_user,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    updated_by      TEXT NOT NULL  DEFAULT current_user
);


-----------------------------------------------------------------------
-- 2.2  Source-system registry  
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
-- 2.3  Zone dimension       
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
    id		     SERIAL      PRIMARY KEY,
    name         TEXT        UNIQUE NOT NULL,
    description  TEXT,
	month_days   TEXT[]      NOT NULL DEFAULT '{}'::text[],   -- '1'…'31' | 'L'
    days         SMALLINT[]  NOT NULL DEFAULT '{}',           -- Sunday-Saturday
    times        TIME[]      NOT NULL DEFAULT '{}',           -- ‘05:00’, ‘18:30’ …
    is_enabled   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    created_by   TEXT        NOT NULL DEFAULT current_user,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    updated_by   TEXT        NOT NULL DEFAULT current_user,
    CONSTRAINT   chk_days_range        CHECK (days <@ '{0,1,2,3,4,5,6}'::SMALLINT[]),
    CONSTRAINT   chk_times_not_empty   CHECK (array_length(times,1) > 0)
	CONSTRAINT   chk_month_days_valid  CHECK ( month_days <@
									        ARRAY[
									          'L','1','2','3','4','5','6','7','8','9','10',
									          '11','12','13','14','15','16','17','18','19','20',
									          '21','22','23','24','25','26','27','28','29','30','31']::text[])
);

CREATE TABLE IF NOT EXISTS "group" (
    id          SERIAL       PRIMARY KEY,
    name        TEXT         UNIQUE NOT NULL,
    description TEXT,
	is_enabled  BOOLEAN      NOT NULL DEFAULT TRUE,
    is_raw      BOOLEAN      NOT NULL DEFAULT FALSE,
    is_bronze   BOOLEAN      NOT NULL DEFAULT FALSE,
    schedule_id INT          REFERENCES schedule(id),
	is_dlt      BOOLEAN      NOT NULL DEFAULT FALSE,
	compute_profile_id INT   REFERENCES mdf_app.compute_profile(id);
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT current_timestamp,
    created_by  TEXT         NOT NULL DEFAULT current_user,
	updated_at  TIMESTAMPTZ  NOT NULL DEFAULT current_timestamp,
    updated_by  TEXT         NOT NULL DEFAULT current_user
);

-- CREATE TABLE mdf_app.group_schedule (
--     group_id     INT NOT NULL REFERENCES mdf_app."group"(id) ON DELETE CASCADE,
--     schedule_id  INT NOT NULL REFERENCES mdf_app.schedule(id) ON DELETE CASCADE,
--     PRIMARY KEY (group_id, schedule_id)
-- );
-----------------------------------------------------------------------
-- 2.5  Global and Group Profile/Settings tables
-----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compute_profile (
    id                SERIAL      PRIMARY KEY,
    name              TEXT        UNIQUE NOT NULL,
    description       TEXT,
    policy_id         TEXT,                                     -- Optional: bind this template to a Databricks cluster-policy and store only the per-job overrides in cluster_json.
    cluster_json      JSONB       NOT NULL,                     -- Pure Databricks ClusterSpec JSON. Everything but libraries here.
    default_libraries JSONB       NOT NULL DEFAULT '[]'::jsonb, -- Array of `{pypi:{package:'xyz==1.2.3'}}` objects that should be attached to every task that uses this profile.
    is_default        BOOLEAN     NOT NULL DEFAULT FALSE,       -- Workspace-wide default. A partial unique index (below) enforces at most one TRUE.
    created_at        TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    created_by        TEXT        NOT NULL DEFAULT current_user,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    updated_by        TEXT        NOT NULL DEFAULT current_user
);
-- Rule: only one row may have is_default = TRUE 
CREATE UNIQUE INDEX IF NOT EXISTS ux_compute_profile_default
    ON compute_profile (is_default)
    WHERE is_default    -- partial index ⇒ affects only TRUE rows
;
--  Seed a sensible default compute profile
INSERT INTO compute_profile
        (name, description, cluster_json, default_libraries, is_default)
VALUES  ('Default-SingleNode-Small',
         'Single-node, D4s_v3 - good for orchestration or light jobs',
         $${
		    "spark_version": "17.1.x-scala2.13",
		    "spark_conf": {
		        "spark.databricks.cluster.profile": "singleNode"
		    },
		    "node_type_id": "Standard_D4s_v3",
		    "custom_tags": {
		        "lf": "orchestrator"
		    },
		    "autotermination_minutes": 0,
		    "single_user_name": "patrick@techcat.ai",
		    "data_security_mode": "SINGLE_USER",
		    "kind": "CLASSIC_PREVIEW",
		    "is_single_node": true,
		    "num_workers": 0
          }$$::jsonb,
	      $$[
            { "pypi": { "package": "databricks-sdk>=0.61.0" } },
            { "pypi": { "package": "psycopg2-binary" } },
            { "pypi": { "package": "databricks-labs-dqx==0.7.1" } }
          ]$$::jsonb,
         TRUE)
ON CONFLICT (name) DO NOTHING;   -- safe re-runs

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

    catalog         TEXT NOT NULL,
    schema_name     TEXT NOT NULL,
    table_name      TEXT NOT NULL,
    connection_id   INT REFERENCES connection(id),

    load_type       TEXT NOT NULL CHECK (load_type IN ('full','incremental', 'append', 'mergedelete')),
    is_stream       BOOLEAN NOT NULL DEFAULT FALSE,

    pk_columns      TEXT[],
    clusterby_cols  TEXT[],
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
    updated_by      TEXT        NOT NULL DEFAULT current_user,
	CONSTRAINT uq_dq_rule_config_name UNIQUE (bronze_config_id, rule_name)
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
-- 3.4  Watermark Audit table For Changes
-----------------------------------------------------------------------
-- CREATE TABLE mdf_app.watermark_audit(
--   audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   zone_id SMALLINT, table_config_id INT,
--   old_value TIMESTAMPTZ, new_value TIMESTAMPTZ,
--   changed_by TEXT DEFAULT current_user,
--   changed_at TIMESTAMPTZ DEFAULT current_timestamp,
--   reason TEXT
-- );

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
  5.  COST, PERFORMANCE, GOVERNANCE  (Profiling)
======================================================================*/
-----------------------------------------------------------------------
-- 5.1  profile_cache
-----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profile_cache (
	zone_id           SMALLINT  NOT NULL REFERENCES zone(id),  -- 1-raw, 2-bronze, 3-silver, 4-gold
    table_config_id   INT       NOT NULL,                      -- raw_config.id or bronze_config.id

    /* run metadata */
    sample_fraction   REAL      NOT NULL,                      -- 1.0 = full profile; 0.5 = 50% of table profiled
    sampled_row_count BIGINT    NOT NULL,					   -- Count of rows sampled to profile the data
    size_bytes        BIGINT,                                  -- DESCRIBE DETAIL <table> to retrieve table's sizeInBytes 
	profile_time_secs INT		NOT NULL,					   -- time it took (in seconds) to run profiling on data

    /* profiler output */
    summary_stats     JSONB     NOT NULL,                      -- `{col:{count:…, mean:…}, …}`
    profiles_json     JSONB     NOT NULL,                      -- raw list of DQProfile objects
                                                               -- (use json.dumps([p.as_dict() for p in profiles]))
    /* bookkeeping */
    profiled_at       TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,

    PRIMARY KEY (table_config_id, zone_id)                     -- one current cache row per table+zone
);
COMMENT ON TABLE profile_cache IS 'Latest profiling statistics & generated DQ profiles per table/zone (cache for quick look-ups)';

-- helpful index if you ever keep many history rows instead of upserts
CREATE INDEX IF NOT EXISTS ix_profile_cache_profiled_at
    ON profile_cache (profiled_at DESC);

-----------------------------------------------------------------------
-- 5.2  dq_suggestion
-----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dq_suggestion (
    id               SERIAL        PRIMARY KEY,

    /* where this suggestion applies */
    table_config_id   INT           NOT NULL,
    zone_id           SMALLINT      NOT NULL REFERENCES zone(id),             -- 1-raw / 2-bronze / 3-Silver
    column_name       TEXT,                                                   -- NULL ⇒ table-wide rule

    /* the proposed rule */
    rule_name         TEXT          NOT NULL,                                 -- e.g.  is_not_null
    rule_sql          TEXT          NOT NULL,                                 -- SQL expression or CHECK
    rule_params       JSONB         NOT NULL DEFAULT '{}'::jsonb,             -- extra knobs (min/max/in…)
    severity          TEXT          NOT NULL DEFAULT 'error' CHECK (severity IN ('warn','fail','drop')),

    /* provenance */
    profiled_at       TIMESTAMPTZ   NOT NULL,                                 -- timestamp from profile_cache
    confidence        REAL          NOT NULL DEFAULT 1.0,                     -- 0-1 heuristic

    /* workflow */
    suggestion_status TEXT          NOT NULL DEFAULT 'new' CHECK (suggestion_status IN ('new','accepted','rejected','implemented', 'disabled')),
    dq_rule_id        INT           REFERENCES dq_rule(id),                    -- filled when promoted
    note              TEXT,                                                   -- approver comments / reason

    /* bookkeeping */
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT current_timestamp,
    created_by        TEXT          NOT NULL DEFAULT current_user,
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT current_timestamp,
    updated_by        TEXT          NOT NULL DEFAULT current_user,

    /* avoid duplicate suggestions for the same profile run */
    UNIQUE (table_config_id, zone_id, column_name, rule_name, profiled_at)
);
COMMENT ON TABLE dq_suggestion IS 'Machine-generated data-quality rules awaiting human review (one row per rule candidate).';
  
/*======================================================================
  6.  HELPER VIEW  (bronze + raw + source_system)
======================================================================*/
-----------------------------------------------------------------------
-- 6.1  vw_raw_extended (Used to build raw control table for ingestion)
-----------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_raw_extended AS
SELECT
       rc.id                  AS raw_config_id,
       rc.group_id,
       g.name                 AS group_name,

       rc.source_system_id,
       ss.name                AS source_name,
       ss.type                AS source_type,          -- adls / sql / restapi

       rc.connection_id,
	   cn.options             AS connection_options,
       rc.source_path,
       rc.output_directory,
	   rc.file_format,

       rc.ingestion_type,                             -- databricks / adf / manual
       rc.copy_options        AS ingest_options,      -- JSONB

       rc.watermark_col,
       rc.watermark_increment_sec,
       rc.watermark_initial,
       COALESCE(wc.last_value, rc.watermark_initial)          AS raw_last_wm_val,     -- last successful watermark

       rc.is_enabled
FROM   raw_config        rc
LEFT   JOIN source_system ss   ON ss.id = rc.source_system_id
LEFT   JOIN "group"      g     ON g.id  = rc.group_id
LEFT   JOIN watermark_cache wc ON wc.table_config_id = rc.id AND wc.zone_id = 1    -- RAW
LEFT   JOIN connection cn      ON rc.connection_id = cn.id
WHERE  rc.is_enabled = True;

-----------------------------------------------------------------------
-- 6.2  vw_bronze_extended (Used to build bronze control table for ingestion)
-----------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_bronze_extended AS
SELECT b.raw_config_id,
	   b.id AS bronze_config_id,
	   r.group_id,
	   g.name AS group_name,
	   ss.name  AS raw_source_name,
       ss.type  AS raw_source_type,
	   r.output_directory AS source_path,
	   r.file_format,
	   b.ingest_options,
	   b.load_type,
	   b.catalog,
	   b.schema_name,
	   b.table_name,
	   b.pk_columns,
	   r.watermark_col,
	   b.is_stream,
	   b.quarantine,
	   b.clusterby_cols,
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

-----------------------------------------------------------------------
-- 6.3  vw_profile_extended (Used to build synthetic data)
-----------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_profile_extended AS
SELECT
    pc.zone_id,
    pc.table_config_id,
    bc.catalog,
    bc.schema_name,
    bc.table_name,
    bc.pk_columns    AS unique_cols,
    tsc.ddl          AS ddl_schema,            -- nullable
    pc.summary_stats,
    pc.profiles_json
FROM   mdf_app.profile_cache pc
JOIN   mdf_app.bronze_config bc
       ON bc.id = pc.table_config_id AND pc.zone_id = 2
LEFT  JOIN mdf_app.table_schema_cache tsc
       ON tsc.table_config_id = pc.table_config_id
WHERE  pc.sample_fraction > 0;

/*======================================================================
  7.  GRANTS / INDEXES  (add as needed)
======================================================================*/


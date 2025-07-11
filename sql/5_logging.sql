-- LakeForge DDL Schemas - Logging
-- database: lakeforge_db
-- schema: mdf_app
/*────────────────────────────────────────────────────────────────────
  0.  ENUM + helper domain
  ────────────────────────────────────────────────────────────────────*/
-- Enum for high-level run status to keep values consistent.
CREATE TYPE mdf_app.run_status AS ENUM ('running','success','warning','failed','skipped');
CREATE TYPE mdf_app.trigger_type AS ENUM ('manual','schedule','adf','api');
CREATE TYPE mdf_app.dq_status AS ENUM ('pass','warn','fail','drop');

/*────────────────────────────────────────────────────────────────────
  1.  batch_run  – one row per orchestration trigger
────────────────────────────────────────────────────────────────────*/
CREATE TABLE mdf_app.batch_run (
    id           UUID PRIMARY KEY,                        		   			-- globally unique run id
    group_id     INT  REFERENCES mdf_app."group"(id) NOT NULL,     			-- group that was invoked
    schedule_id  INT  REFERENCES mdf_app.schedule(id) ON DELETE SET NULL,   -- schedule that triggered it (nullable for ad-hoc). Keep historical if deleting/recreate a schedule
    batch_name   TEXT NOT NULL,                           		   			-- friendly label (can duplicate group name)
    trigger_type mdf_app.trigger_type NOT NULL,           		   			-- manual | schedule | adf | api
    scheduled_ts TIMESTAMPTZ,                             		   			-- when schedule said “run” (nullable)
	-- schedule_pipeline_run_id   -- might add in future
	-- group_pipeline_run_id      -- might add in future
    started_at   TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    finished_at  TIMESTAMPTZ,
    status       mdf_app.run_status NOT NULL DEFAULT 'running',
    message      TEXT                             		  -- free-text / error blob
);
CREATE INDEX ix_batch_run_started ON mdf_app.batch_run(started_at DESC);
COMMENT ON TABLE  mdf_app.batch_run IS 'One record per logical pipeline trigger (group + schedule combo).';

/*────────────────────────────────────────────────────────────────────
  2.  table_run  – one per table_config processed inside a batch
────────────────────────────────────────────────────────────────────*/
CREATE TABLE mdf_app.table_run (
    id              UUID PRIMARY KEY,
    batch_id        UUID REFERENCES mdf_app.batch_run(id) ON DELETE CASCADE,
    table_config_id INT  REFERENCES mdf_app.bronze_config(id),
    started_at      TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    finished_at     TIMESTAMPTZ,
    status          mdf_app.run_status NOT NULL DEFAULT 'running',
    row_ct_in       BIGINT,
    row_ct_out      BIGINT,
    message         TEXT
);
CREATE INDEX ix_table_run_batch ON mdf_app.table_run(batch_id);
COMMENT ON TABLE mdf_app.table_run IS 'Execution log for each source table within a batch run.';

/*────────────────────────────────────────────────────────────────────
  3.  dq_run  – one per rule evaluated inside a table_run
────────────────────────────────────────────────────────────────────*/
CREATE TABLE mdf_app.dq_run (
    id            UUID PRIMARY KEY,
    table_run_id  UUID REFERENCES mdf_app.table_run(id) ON DELETE CASCADE,
    dq_rule_id    INT  REFERENCES mdf_app.dq_rule(id),
    run_at        TIMESTAMPTZ DEFAULT current_timestamp,
    status        mdf_app.dq_status NOT NULL,
	-- passed_rows    -- might add in future
	-- dropped_rows   -- might add in future
    failing_rows  BIGINT DEFAULT 0,                  -- never store null to sum quickly
    message       TEXT
);

COMMENT ON TABLE mdf_app.dq_run IS 'Outcome of each data-quality rule during a table run.';

/*────────────────────────────────────────────────────────────────────
  4.  Optional helper view (dev ergonomics)
────────────────────────────────────────────────────────────────────*/
CREATE OR REPLACE VIEW mdf_app.vw_batch_latest AS
SELECT *
FROM   mdf_app.batch_run
ORDER BY started_at DESC
LIMIT 100;

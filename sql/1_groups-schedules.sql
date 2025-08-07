-- LakeForge DDL Schemas - Groups and Schedules
-- database: lakeforge_db
-- schema: mdf_app
/* ────────────────────────────────────────────────────────────────
   1. GROUPS  – logical collection of tables
──────────────────────────────────────────────────────────────── */
CREATE TABLE mdf_app."group" (
    id		     SERIAL PRIMARY KEY,
    name         TEXT UNIQUE NOT NULL,
    description  TEXT,
    is_enabled   BOOLEAN      NOT NULL DEFAULT TRUE,
	is_raw       BOOLEAN NOT NULL DEFAULT FALSE,
	is_bronze    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT current_timestamp,
    created_by   TEXT         NOT NULL DEFAULT current_user,
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT current_timestamp,
    updated_by   TEXT         NOT NULL DEFAULT current_user
);

CREATE INDEX ix_group_enabled ON mdf_app."group"(is_enabled);
COMMENT ON COLUMN mdf_app."group".is_raw    IS 'If TRUE this group triggers raw ingestion jobs';
COMMENT ON COLUMN mdf_app."group".is_bronze IS 'If TRUE this group triggers bronze ingestion jobs';


/* ────────────────────────────────────────────────────────────────
   2. SCHEDULES  – when to trigger a group
      - month_days: 0-31 where 0 = last day  (nullable ⇒ every day)
      - weekdays:   0-6 where 0 = Sunday     (nullable ⇒ every day)
      - times:      array of TIME(s)          (nullable ⇒ every hour 00:00)
──────────────────────────────────────────────────────────────── */
CREATE TABLE mdf_app.schedule (
    id		     SERIAL PRIMARY KEY,
    name         TEXT UNIQUE NOT NULL,
    description  TEXT,
    month_days   SMALLINT[]  NOT NULL DEFAULT '{}',
    weekdays     SMALLINT[]  NOT NULL DEFAULT '{}',   -- Sunday-Saturday
    times        TIME[]      NOT NULL DEFAULT '{}',   -- ‘05:00’, ‘18:30’ …
    is_enabled   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    created_by   TEXT        NOT NULL DEFAULT current_user,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    updated_by   TEXT        NOT NULL DEFAULT current_user,
    CONSTRAINT chk_weekdays_range  CHECK (weekdays <@ '{0,1,2,3,4,5,6}'::SMALLINT[]),
    CONSTRAINT chk_times_not_empty CHECK (array_length(times,1) > 0),
    CONSTRAINT chk_month_days_range CHECK (
        month_days <@ array[0,1,2,3,4,5,6,7,8,9,
                             10,11,12,13,14,15,16,17,18,19,
                             20,21,22,23,24,25,26,27,28,29,30,31]::SMALLINT[]
    )
);

/* ────────────────────────────────────────────────────────────────
   3. GROUP ⇢ SCHEDULE (1-to-N)  – a group may have several schedules
──────────────────────────────────────────────────────────────── */
CREATE TABLE mdf_app.group_schedule (
    group_id     INT NOT NULL REFERENCES mdf_app."group"(id) ON DELETE CASCADE,
    schedule_id  INT NOT NULL REFERENCES mdf_app.schedule(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, schedule_id)
);




-- LakeForge DDL Schemas
-- database: lakeforge_db
-- schema: mdf_app
-- dq_rule: Validate data on arrival (SQL dialect only)
CREATE TABLE mdf_app.dq_rule (
    id               SERIAL PRIMARY KEY,
    is_enabled       BOOLEAN DEFAULT false,
    table_config_id  INT NOT NULL
                         REFERENCES mdf_app.bronze_config(id)
                         ON DELETE CASCADE,
    rule_name        TEXT        NOT NULL,
    rule_sql         TEXT        NOT NULL,
    severity         TEXT        NOT NULL
                         CHECK (severity IN ('warn', 'fail', 'drop')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    created_by       TEXT        NOT NULL,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    updated_by       TEXT        NOT NULL
);

CREATE INDEX idx_dq_rule_table ON mdf_app.dq_rule(table_config_id);



-- LakeForge DDL Schemas
-- database: lakeforge_db
-- schema: mdf_app
-- connection: Stores name, jdbc_url/catalog_name, secret scope, secret key for connections
CREATE TABLE connection (
    id            SERIAL PRIMARY KEY,
    name          TEXT UNIQUE NOT NULL,
    jdbc_url      TEXT        NOT NULL,
    secret_scope  TEXT        NOT NULL,
    secret_key    TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    created_by    TEXT        NOT NULL
);
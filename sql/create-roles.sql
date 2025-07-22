-- Run these by hand, one time, in the Lakebase Databricks SQL Editor.

-- 1. Run the create database first. Then switch the context in the sql editor to lakeforge_db
CREATE DATABASE lakeforge_db;

-- 2. Once the editor's context has switched to `lakeforge_db`, create the schema. Verify it is showing in the catalog.
CREATE SCHEMA mdf_app;
COMMENT ON SCHEMA mdf_app IS 'Schema for Lake-Forge tables (table_config, dq_rule, …)';

-- If you make any mistakes in step 1 or 2:
-- DROP DATABASE lakeforge_db;
-- DROP SCHEMA mdf_app;

-- 3. CREATING ROLE AND GRANTING ACCESS TO ADMIN for our mdf_app schema
CREATE ROLE dbx_admin LOGIN PASSWORD 'xxxxxxxx';
GRANT ALL PRIVILEGES ON DATABASE lakeforge_db TO dbx_admin;
GRANT ALL PRIVILEGES ON SCHEMA mdf_app TO dbx_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA mdf_app GRANT ALL PRIVILEGES ON TABLES TO dbx_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA mdf_app GRANT ALL PRIVILEGES ON SEQUENCES TO dbx_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA mdf_app GRANT ALL PRIVILEGES ON FUNCTIONS TO dbx_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA mdf_app TO dbx_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA mdf_app TO dbx_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA mdf_app TO dbx_admin;

-- Quality‑of‑life: make the schema the default for dbx_admin
ALTER ROLE dbx_admin SET search_path = mdf_app, public;
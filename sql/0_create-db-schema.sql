-- run these by hand, one time, in a Lakebase SQL worksheet
-- As of 2025-07-05: We don't have a create or replace option yet, and no way to switch context
CREATE DATABASE lakeforge_db;

CREATE SCHEMA mdf_app;
COMMENT ON SCHEMA mdf_app IS 'Schema for Lake-Forge tables (table_config, dq_rule, …)';


-- DROP database and schema
-- DROP DATABASE lakeforge_db;
-- DROP SCHEMA mdf_app;
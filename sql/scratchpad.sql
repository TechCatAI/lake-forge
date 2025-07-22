-- Check version and set schema to mdf_app
SELECT version();     
SET search_path TO mdf_app;
--------------------------
--- CORE SYSTEM TABLES ---
--------------------------
SELECT * FROM source_system;
SELECT * FROM connection;
SELECT * FROM zone;
SELECT * FROM schedule;
SELECT * FROM "group";
SELECT * FROM group_schedule;

--------------------------
--- CORE CONFIG TABLES ---
--------------------------
SELECT * FROM raw_config;
SELECT * FROM bronze_config;
	UPDATE raw_config SET group_id = 1;
SELECT * FROM dq_rule;
SELECT * FROM watermark;
SELECT * FROM table_schema_cache;
-- SELECT * FROM mdf_app.table_group;

--------------------------
----- LOGGING TABLES -----
--------------------------
SELECT * FROM batch_run;
-- DELETE FROM batch_run;
SELECT * FROM zone_run;
SELECT * FROM table_run;
-- DELETE FROM table_run;
SELECT * FROM step_run;
SELECT * FROM dq_run;

----------------------------
--- UTILITY HELPER VIEWS ---
----------------------------
SELECT * FROM vw_bronze_extended; -- view that will be called by RawToBronze (classic and DLT)

-- SELECT * FROM mdf_app.vw_table_with_group; -- This view called by DLT loop for table configs.
-- SELECT * FROM mdf_app.vw_batch_latest;     -- This view called by dashboard


-- RESET DROP TABLES to rebuild
-- DROP VIEW mdf_app.vw_bronze_extended;
-- logging --
DROP TABLE mdf_app.dq_run;
DROP TABLE mdf_app.step_run;
DROP TABLE mdf_app.table_run;
DROP TABLE mdf_app.zone_run;
DROP TABLE mdf_app.batch_run;
-- table config --
-- DROP TABLE mdf_app.table_schema_cache;
-- DROP TABLE mdf_app.watermark;
-- DROP TABLE mdf_app.dq_rule;
-- DROP TABLE mdf_app.table_group;
-- DROP TABLE mdf_app.bronze_config;
-- DROP TABLE mdf_app.raw_config;
-- core config --
-- DROP TABLE mdf_app.schedule;
-- DROP TABLE mdf_app.group;
-- DROP TABLE mdf_app.group_schedule;
-- DROP TABLE mdf_app.source_system;
-- DROP TABLE mdf_app.connection;
-- DROP TABLE mdf_app.zone;

-- scratch updates. make sure to add to bootstrap file
-- ALTER TABLE mdf_app.connection ADD COLUMN updated_at   TIMESTAMPTZ NOT NULL DEFAULT current_timestamp; ----
-- ALTER TABLE mdf_app.connection ADD COLUMN updated_by   TEXT        NOT NULL DEFAULT current_user; -----
-- ALTER TABLE mdf_app.source_system ADD COLUMN updated_at   TIMESTAMPTZ NOT NULL DEFAULT current_timestamp; ----
-- ALTER TABLE mdf_app.source_system ADD COLUMN updated_by   TEXT        NOT NULL DEFAULT current_user; -----
-- ALTER TABLE mdf_app.group ADD COLUMN created_at   TIMESTAMPTZ NOT NULL DEFAULT current_timestamp; ----
-- ALTER TABLE mdf_app.group ADD COLUMN created_by   TEXT        NOT NULL DEFAULT current_user; -----
-- ALTER TABLE mdf_app.group ADD COLUMN updated_at   TIMESTAMPTZ NOT NULL DEFAULT current_timestamp; ----
-- ALTER TABLE mdf_app.group ADD COLUMN updated_by   TEXT        NOT NULL DEFAULT current_user; -----





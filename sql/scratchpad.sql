-- SANITY CHECK core tables
SELECT * FROM mdf_app.connection;

SELECT * FROM mdf_app.group;

SELECT * FROM mdf_app.schedule;

SELECT * FROM mdf_app.group_schedule;

SELECT * FROM mdf_app.table_group;

SELECT * FROM mdf_app.raw_config;

SELECT * FROM mdf_app.bronze_config;
	UPDATE mdf_app.raw_config SET group_id = 1;
SELECT * FROM mdf_app.dq_rule;

-- SANITY CHECK logging tables
SELECT * FROM mdf_app.batch_run;
-- DELETE FROM mdf_app.batch_run;

SELECT * FROM mdf_app.table_run;

SELECT * FROM mdf_app.dq_run;

-- SANITY CHECK core views. 
SELECT * FROM mdf_app.vw_table_with_group; -- This view called by DLT loop for table configs.

SELECT * FROM mdf_app.vw_batch_latest;     -- This view called by dashboard


-- RESET DROP TABLES to rebuild
-- DROP VIEW mdf_app.vw_table_with_group;
-- DROP VIEW mdf_app.vw_batch_latest
-- DROP TABLE mdf_app.dq_run;
-- DROP TABLE mdf_app.table_run;
-- DROP TABLE mdf_app.batch_run;
-- DROP TABLE mdf_app.dq_rule;
-- DROP TABLE mdf_app.table_group;
-- DROP TABLE mdf_app.table_config;
-- DROP TABLE mdf_app.schedule;
-- DROP TABLE mdf_app.group;
-- DROP TABLE mdf_app.group_schedule;






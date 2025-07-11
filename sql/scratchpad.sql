-- SANITY CHECK core tables
SELECT * FROM mdf_app.connection;

SELECT * FROM mdf_app.group;

SELECT * FROM mdf_app.schedule;

SELECT * FROM mdf_app.group_schedule;

SELECT * FROM mdf_app.table_group;

SELECT * FROM mdf_app.table_config;

SELECT * FROM mdf_app.dq_rule;

-- SANITY CHECK logging tables
SELECT * FROM mdf_app.batch_run;

SELECT * FROM mdf_app.table_run;

SELECT * FROM mdf_app.dq_run;

-- SANITY CHECK core views. 
SELECT * FROM mdf_app.vw_table_with_group; -- This view called by DLT loop for table configs.

SELECT * FROM mdf_app.vw_batch_latest;     -- This view called by dashboard



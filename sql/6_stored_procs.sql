-- LakeForge DDL Schemas - Logging
-- database: lakeforge_db
-- schema: mdf_app
CREATE OR REPLACE PROCEDURE mdf_app.start_batch(_name text, _trigger text)
LANGUAGE plpgsql AS $$
DECLARE _id uuid := gen_random_uuid();
BEGIN
  INSERT INTO mdf_app.batch_run(id,batch_name,trigger_type,status)
  VALUES (_id,_name,_trigger,'running');
  RETURN _id;
END; $$;
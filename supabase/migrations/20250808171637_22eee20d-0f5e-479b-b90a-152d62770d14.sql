-- Move all extensions installed in the public schema to the extensions schema
DO $$
DECLARE
  ext RECORD;
BEGIN
  -- Ensure target schema exists
  EXECUTE 'CREATE SCHEMA IF NOT EXISTS extensions';

  -- Loop through extensions whose objects are in the public schema
  FOR ext IN
    SELECT e.extname
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('ALTER EXTENSION %I SET SCHEMA extensions;', ext.extname);
  END LOOP;
END $$;
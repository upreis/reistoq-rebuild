-- Move supported extensions from public to extensions, skipping those that don't support SET SCHEMA (e.g., pg_net)
DO $$
DECLARE
  ext RECORD;
BEGIN
  EXECUTE 'CREATE SCHEMA IF NOT EXISTS extensions';

  FOR ext IN
    SELECT e.extname
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE n.nspname = 'public'
      AND e.extname NOT IN ('pg_net')
  LOOP
    BEGIN
      EXECUTE format('ALTER EXTENSION %I SET SCHEMA extensions;', ext.extname);
    EXCEPTION WHEN feature_not_supported THEN
      -- Skip if the extension does not support SET SCHEMA
      NULL;
    END;
  END LOOP;
END $$;
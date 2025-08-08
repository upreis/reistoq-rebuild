-- Ensure extensions schema exists
create schema if not exists extensions;

-- Move the 'http' extension from public to extensions by drop+create (SET SCHEMA not supported by some versions)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'http' AND n.nspname = 'public'
  ) THEN
    -- Drop the extension (drops its objects in public)
    DROP EXTENSION IF EXISTS http;
    -- Recreate under extensions schema
    CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
  END IF;
END $$;
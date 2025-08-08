-- Ensure extensions schema exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_net to extensions (or create there if missing)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_extension e
      JOIN pg_namespace n ON n.oid = e.extnamespace
      WHERE e.extname = 'pg_net' AND n.nspname = 'extensions'
    ) THEN
      ALTER EXTENSION pg_net SET SCHEMA extensions;
    END IF;
  ELSE
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
  END IF;
END
$$;

-- Move pg_cron to extensions when possible (keep cron schema for its objects)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_extension e
      JOIN pg_namespace n ON n.oid = e.extnamespace
      WHERE e.extname = 'pg_cron' AND n.nspname = 'extensions'
    ) THEN
      BEGIN
        ALTER EXTENSION pg_cron SET SCHEMA extensions;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not move pg_cron to schema extensions: %', SQLERRM;
      END;
    END IF;
  ELSE
    -- create, then try to move (ignore if not supported)
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    BEGIN
      ALTER EXTENSION pg_cron SET SCHEMA extensions;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not move pg_cron to schema extensions: %', SQLERRM;
    END;
  END IF;
END
$$;
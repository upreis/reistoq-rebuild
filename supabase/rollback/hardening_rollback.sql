-- Rollback script for integration secrets hardening
-- WARNING: This will reintroduce the legacy auth_data column (jsonb)
-- Use only for emergency rollback.

BEGIN;

-- 1) Re-add legacy column
ALTER TABLE public.integration_accounts
  ADD COLUMN IF NOT EXISTS auth_data jsonb;

-- 2) Backfill a minimal payload from integration_secrets into auth_data
--    Note: Only non-sensitive public fields are restored by default to avoid leaking secrets.
--    Adjust as necessary if a full revert is strictly required.
UPDATE public.integration_accounts ia
SET auth_data = jsonb_strip_nulls(jsonb_build_object(
  'store_id', COALESCE(ia.public_auth->>'store_id',''),
  'nickname', COALESCE(ia.public_auth->>'nickname','')
))
WHERE ia.auth_data IS NULL;

-- 3) Optionally drop the new table (disabled by default)
-- DROP TABLE IF EXISTS public.integration_secrets;

COMMIT;

-- Remove legacy sensitive column from integration_accounts if still present
ALTER TABLE public.integration_accounts
  DROP COLUMN IF EXISTS auth_data;

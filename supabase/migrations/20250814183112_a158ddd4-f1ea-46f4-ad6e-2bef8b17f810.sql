-- Security Enhancement: Migrate sensitive credentials to Supabase Vault
-- This migration addresses the security concern about storing API keys and tokens in regular tables

BEGIN;

-- Create a function to migrate existing secrets to vault and update integration_secrets structure
CREATE OR REPLACE FUNCTION migrate_secrets_to_vault()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  secret_record RECORD;
  vault_secret_id uuid;
BEGIN
  -- Iterate through existing integration_secrets
  FOR secret_record IN 
    SELECT id, integration_account_id, provider, access_token, refresh_token, client_id, client_secret, expires_at, payload
    FROM public.integration_secrets
  LOOP
    -- Only migrate if we have sensitive data
    IF secret_record.access_token IS NOT NULL OR 
       secret_record.refresh_token IS NOT NULL OR 
       secret_record.client_secret IS NOT NULL THEN
      
      -- Store sensitive data in vault
      INSERT INTO vault.secrets (name, secret)
      VALUES (
        'integration_secret_' || secret_record.id::text,
        jsonb_build_object(
          'access_token', COALESCE(secret_record.access_token, ''),
          'refresh_token', COALESCE(secret_record.refresh_token, ''),
          'client_secret', COALESCE(secret_record.client_secret, ''),
          'client_id', COALESCE(secret_record.client_id, ''),
          'expires_at', COALESCE(secret_record.expires_at::text, ''),
          'payload', COALESCE(secret_record.payload, '{}'::jsonb)
        )::text
      )
      RETURNING id INTO vault_secret_id;
      
      -- Update integration_secrets to reference vault secret and remove sensitive data
      UPDATE public.integration_secrets
      SET 
        vault_secret_id = vault_secret_id,
        access_token = NULL,
        refresh_token = NULL,
        client_secret = NULL,
        client_id = NULL,
        payload = NULL
      WHERE id = secret_record.id;
    END IF;
  END LOOP;
END;
$$;

-- Add vault_secret_id column to integration_secrets
ALTER TABLE public.integration_secrets 
ADD COLUMN IF NOT EXISTS vault_secret_id uuid REFERENCES vault.secrets(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_integration_secrets_vault_id 
ON public.integration_secrets(vault_secret_id);

-- Execute the migration
SELECT migrate_secrets_to_vault();

-- Drop the migration function as it's no longer needed
DROP FUNCTION migrate_secrets_to_vault();

-- Create helper functions for accessing vault secrets securely

-- Function to get decrypted secret from vault for integration accounts
CREATE OR REPLACE FUNCTION get_integration_secret(account_id uuid, provider_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vault_id uuid;
  secret_data text;
  result jsonb;
BEGIN
  -- Get the vault secret ID
  SELECT vault_secret_id INTO vault_id
  FROM public.integration_secrets
  WHERE integration_account_id = account_id 
    AND provider = provider_name
    AND vault_secret_id IS NOT NULL;
  
  IF vault_id IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;
  
  -- Get the secret from vault
  SELECT decrypted_secret INTO secret_data
  FROM vault.decrypted_secrets
  WHERE id = vault_id;
  
  IF secret_data IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;
  
  -- Parse and return the secret data
  BEGIN
    result := secret_data::jsonb;
    RETURN result;
  EXCEPTION WHEN OTHERS THEN
    RETURN '{}'::jsonb;
  END;
END;
$$;

-- Function to update integration secret in vault
CREATE OR REPLACE FUNCTION update_integration_secret(
  account_id uuid, 
  provider_name text, 
  new_access_token text DEFAULT NULL,
  new_refresh_token text DEFAULT NULL,
  new_client_secret text DEFAULT NULL,
  new_client_id text DEFAULT NULL,
  new_expires_at timestamp with time zone DEFAULT NULL,
  new_payload jsonb DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vault_id uuid;
  current_secret jsonb;
  updated_secret jsonb;
BEGIN
  -- Get the vault secret ID
  SELECT vault_secret_id INTO vault_id
  FROM public.integration_secrets
  WHERE integration_account_id = account_id 
    AND provider = provider_name;
  
  -- Get current secret data or create new structure
  IF vault_id IS NOT NULL THEN
    current_secret := get_integration_secret(account_id, provider_name);
  ELSE
    current_secret := '{}'::jsonb;
  END IF;
  
  -- Build updated secret with new values
  updated_secret := current_secret;
  
  IF new_access_token IS NOT NULL THEN
    updated_secret := jsonb_set(updated_secret, '{access_token}', to_jsonb(new_access_token));
  END IF;
  
  IF new_refresh_token IS NOT NULL THEN
    updated_secret := jsonb_set(updated_secret, '{refresh_token}', to_jsonb(new_refresh_token));
  END IF;
  
  IF new_client_secret IS NOT NULL THEN
    updated_secret := jsonb_set(updated_secret, '{client_secret}', to_jsonb(new_client_secret));
  END IF;
  
  IF new_client_id IS NOT NULL THEN
    updated_secret := jsonb_set(updated_secret, '{client_id}', to_jsonb(new_client_id));
  END IF;
  
  IF new_expires_at IS NOT NULL THEN
    updated_secret := jsonb_set(updated_secret, '{expires_at}', to_jsonb(new_expires_at::text));
  END IF;
  
  IF new_payload IS NOT NULL THEN
    updated_secret := jsonb_set(updated_secret, '{payload}', new_payload);
  END IF;
  
  -- Update or create vault secret
  IF vault_id IS NOT NULL THEN
    -- Update existing vault secret
    UPDATE vault.secrets
    SET secret = updated_secret::text
    WHERE id = vault_id;
  ELSE
    -- Create new vault secret
    INSERT INTO vault.secrets (name, secret)
    VALUES (
      'integration_secret_' || gen_random_uuid()::text,
      updated_secret::text
    )
    RETURNING id INTO vault_id;
    
    -- Update integration_secrets to reference the new vault secret
    UPDATE public.integration_secrets
    SET vault_secret_id = vault_id
    WHERE integration_account_id = account_id AND provider = provider_name;
  END IF;
  
  -- Update the metadata in integration_secrets
  UPDATE public.integration_secrets
  SET 
    expires_at = COALESCE(new_expires_at, expires_at),
    updated_at = now()
  WHERE integration_account_id = account_id AND provider = provider_name;
  
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA vault TO service_role;
GRANT SELECT, INSERT, UPDATE ON vault.secrets TO service_role;
GRANT SELECT ON vault.decrypted_secrets TO service_role;

COMMIT;
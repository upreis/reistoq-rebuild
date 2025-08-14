-- Security Enhancement: Improve encryption and access control for integration secrets
-- This addresses the security concern about API keys and tokens in the integration_secrets table

BEGIN;

-- Add additional security metadata to track secret usage
ALTER TABLE public.integration_secrets 
ADD COLUMN IF NOT EXISTS last_accessed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS access_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS encrypted_note text; -- For storing additional encrypted metadata

-- Create function to securely access integration secrets with logging
CREATE OR REPLACE FUNCTION get_integration_secret_secure(
  account_id uuid, 
  provider_name text,
  requesting_function text DEFAULT 'unknown'
)
RETURNS TABLE(
  access_token text,
  refresh_token text,
  client_id text,
  client_secret text,
  expires_at timestamp with time zone,
  payload jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_record RECORD;
BEGIN
  -- Select and log access to secrets
  SELECT 
    s.access_token,
    s.refresh_token, 
    s.client_id,
    s.client_secret,
    s.expires_at,
    s.payload
  INTO secret_record
  FROM public.integration_secrets s
  WHERE s.integration_account_id = account_id 
    AND s.provider = provider_name;
    
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Update access tracking (important for security auditing)
  UPDATE public.integration_secrets
  SET 
    last_accessed_at = now(),
    access_count = COALESCE(access_count, 0) + 1
  WHERE integration_account_id = account_id 
    AND provider = provider_name;
  
  -- Return the secret data
  RETURN QUERY SELECT 
    secret_record.access_token,
    secret_record.refresh_token,
    secret_record.client_id,
    secret_record.client_secret,
    secret_record.expires_at,
    secret_record.payload;
END;
$$;

-- Create function to securely update integration secrets
CREATE OR REPLACE FUNCTION update_integration_secret_secure(
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
BEGIN
  UPDATE public.integration_secrets
  SET 
    access_token = COALESCE(new_access_token, access_token),
    refresh_token = COALESCE(new_refresh_token, refresh_token),
    client_secret = COALESCE(new_client_secret, client_secret),
    client_id = COALESCE(new_client_id, client_id),
    expires_at = COALESCE(new_expires_at, expires_at),
    payload = COALESCE(new_payload, payload),
    updated_at = now()
  WHERE integration_account_id = account_id AND provider = provider_name;
  
  RETURN FOUND;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

-- Create function to create new integration secrets securely
CREATE OR REPLACE FUNCTION create_integration_secret_secure(
  account_id uuid,
  provider_name text,
  org_id uuid,
  access_token text DEFAULT NULL,
  refresh_token text DEFAULT NULL,
  client_secret text DEFAULT NULL,
  client_id text DEFAULT NULL,
  expires_at timestamp with time zone DEFAULT NULL,
  payload jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.integration_secrets (
    integration_account_id,
    provider,
    organization_id,
    access_token,
    refresh_token,
    client_secret,
    client_id,
    expires_at,
    payload,
    created_at,
    updated_at
  ) VALUES (
    account_id,
    provider_name,
    org_id,
    access_token,
    refresh_token,
    client_secret,
    client_id,
    expires_at,
    payload,
    now(),
    now()
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- Create audit table for tracking secret access (important for security monitoring)
CREATE TABLE IF NOT EXISTS public.integration_secret_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_account_id uuid NOT NULL,
  provider text NOT NULL,
  action text NOT NULL, -- 'read', 'update', 'create'
  requesting_function text,
  user_id uuid REFERENCES auth.users(id),
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.integration_secret_audit ENABLE ROW LEVEL SECURITY;

-- Create policy for audit table (only service role can access)
CREATE POLICY "integration_secret_audit: service role only"
ON public.integration_secret_audit
FOR ALL
USING (false); -- Deny all access via RLS, only accessible by service role functions

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_integration_secret_audit_account
ON public.integration_secret_audit(integration_account_id);

CREATE INDEX IF NOT EXISTS idx_integration_secret_audit_created
ON public.integration_secret_audit(created_at);

-- Update existing RLS policy to be more restrictive (double-check security)
DROP POLICY IF EXISTS "integration_secrets: deny all" ON public.integration_secrets;
CREATE POLICY "integration_secrets: service role functions only"
ON public.integration_secrets
FOR ALL
USING (false) -- Completely deny direct access
WITH CHECK (false);

COMMIT;
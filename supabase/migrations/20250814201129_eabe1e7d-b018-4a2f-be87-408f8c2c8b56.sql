-- Fix the get_integration_secret_secure function to be read-only compatible
CREATE OR REPLACE FUNCTION public.get_integration_secret_secure(
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
SET search_path TO 'public'
AS $function$
DECLARE
  secret_record RECORD;
BEGIN
  -- Select secret data without updating access tracking
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
  
  -- Log access to audit table (fire and forget - no error if this fails)
  BEGIN
    INSERT INTO public.integration_secrets_audit (
      integration_account_id,
      provider,
      action,
      requesting_function,
      user_id,
      created_at
    ) VALUES (
      account_id,
      provider_name,
      'access',
      requesting_function,
      auth.uid(),
      now()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ignore audit failures
    NULL;
  END;
  
  -- Return the secret data
  RETURN QUERY SELECT 
    secret_record.access_token,
    secret_record.refresh_token,
    secret_record.client_id,
    secret_record.client_secret,
    secret_record.expires_at,
    secret_record.payload;
END;
$function$
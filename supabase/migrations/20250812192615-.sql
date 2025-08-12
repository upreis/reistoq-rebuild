-- Create Tiny v3 OAuth tables
-- 1) Credentials per organization
CREATE TABLE IF NOT EXISTS public.tiny_v3_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  client_id text NOT NULL,
  client_secret text NOT NULL,
  redirect_uri text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Tokens per organization
CREATE TABLE IF NOT EXISTS public.tiny_v3_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  scope text,
  token_type text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tiny_v3_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiny_v3_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Read own org rows
CREATE POLICY IF NOT EXISTS "tiny_v3_credentials: org read" ON public.tiny_v3_credentials
FOR SELECT USING (organization_id = public.get_current_org_id());

CREATE POLICY IF NOT EXISTS "tiny_v3_tokens: org read" ON public.tiny_v3_tokens
FOR SELECT USING (organization_id = public.get_current_org_id());

-- Do NOT allow INSERT/UPDATE/DELETE for regular users (no policies) so only service role can bypass

-- Triggers to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_tiny_v3_credentials_updated ON public.tiny_v3_credentials;
CREATE TRIGGER trg_tiny_v3_credentials_updated
BEFORE UPDATE ON public.tiny_v3_credentials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_tiny_v3_tokens_updated ON public.tiny_v3_tokens;
CREATE TRIGGER trg_tiny_v3_tokens_updated
BEFORE UPDATE ON public.tiny_v3_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
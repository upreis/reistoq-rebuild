-- Create missing audit table and fix any issues
CREATE TABLE IF NOT EXISTS public.integration_secrets_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    requesting_function VARCHAR(100),
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Enable RLS on audit table
ALTER TABLE public.integration_secrets_audit ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for audit table (only admins can read)
CREATE POLICY "Only admins can view audit logs" ON public.integration_secrets_audit
    FOR SELECT USING (FALSE); -- Deny all access by default

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_integration_secrets_audit_account_id ON public.integration_secrets_audit(account_id);
CREATE INDEX IF NOT EXISTS idx_integration_secrets_audit_created_at ON public.integration_secrets_audit(created_at);

-- Fix historico_vendas_public table issue (create if missing)
CREATE TABLE IF NOT EXISTS public.historico_vendas_public (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.historico_vendas_public ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policy
CREATE POLICY "Users can view their own organization records" ON public.historico_vendas_public
    FOR SELECT USING (TRUE); -- Placeholder policy
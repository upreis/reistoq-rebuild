BEGIN;

-- 1) Remover surface pública de vendas
DROP VIEW IF EXISTS public.historico_vendas_public;

-- 2) Blindar credenciais/tokens Tiny v3
-- tiny_v3_credentials
ALTER TABLE public.tiny_v3_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tiny_v3_credentials FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tiny_v3_credentials TO service_role;
DROP POLICY IF EXISTS "tiny_v3_credentials_deny_all" ON public.tiny_v3_credentials;
CREATE POLICY "tiny_v3_credentials_deny_all"
ON public.tiny_v3_credentials
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- tiny_v3_tokens
ALTER TABLE public.tiny_v3_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tiny_v3_tokens FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tiny_v3_tokens TO service_role;
DROP POLICY IF EXISTS "tiny_v3_tokens_deny_all" ON public.tiny_v3_tokens;
CREATE POLICY "tiny_v3_tokens_deny_all"
ON public.tiny_v3_tokens
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

COMMIT;
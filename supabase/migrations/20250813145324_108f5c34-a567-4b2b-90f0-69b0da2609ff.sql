BEGIN;

-- ========================================
-- COMPREHENSIVE SECURITY MIGRATION
-- ========================================

-- Enable RLS + FORCE RLS on sensitive tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.integration_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos FORCE ROW LEVEL SECURITY;
ALTER TABLE public.historico_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_vendas FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizacoes FORCE ROW LEVEL SECURITY;

-- REVOKE ALL from PUBLIC and anon
REVOKE ALL ON public.profiles FROM PUBLIC, anon;
REVOKE ALL ON public.integration_accounts FROM PUBLIC, anon;
REVOKE ALL ON public.pedidos FROM PUBLIC, anon;
REVOKE ALL ON public.historico_vendas FROM PUBLIC, anon;
REVOKE ALL ON public.invitations FROM PUBLIC, anon;
REVOKE ALL ON public.organizacoes FROM PUBLIC, anon;

-- ========================================
-- SECRETS TABLES - COMPLETE LOCKDOWN
-- ========================================

-- Enable RLS on secrets tables and deny all access to regular users
ALTER TABLE public.tiny_v3_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiny_v3_credentials FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tiny_v3_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiny_v3_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE public.integration_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_secrets FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.tiny_v3_credentials FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.tiny_v3_tokens FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.integration_secrets FROM PUBLIC, anon, authenticated;

-- Only service_role can access secrets
GRANT ALL ON public.tiny_v3_credentials TO service_role;
GRANT ALL ON public.tiny_v3_tokens TO service_role;
GRANT ALL ON public.integration_secrets TO service_role;

-- ========================================
-- REGISTER REQUIRED PERMISSIONS
-- ========================================

INSERT INTO public.app_permissions (key, name, description) VALUES
('users:read', 'Ler usuários', 'Permite visualizar perfis de usuários da organização'),
('users:manage', 'Gerenciar usuários', 'Permite editar perfis de usuários da organização'),
('integrations:manage', 'Gerenciar integrações', 'Permite configurar contas de integração'),
('orders:read', 'Ler pedidos', 'Permite visualizar pedidos da organização'),
('sales:read', 'Ler histórico de vendas', 'Permite visualizar histórico de vendas da organização'),
('invites:read', 'Ler convites', 'Permite visualizar convites da organização'),
('invites:manage', 'Gerenciar convites', 'Permite criar e gerenciar convites')
ON CONFLICT (key) DO NOTHING;

-- ========================================
-- CLEAN OLD POLICIES
-- ========================================

DO $$
DECLARE 
  p text;
  tables text[] := ARRAY['profiles', 'integration_accounts', 'pedidos', 'historico_vendas', 'invitations', 'organizacoes', 'tiny_v3_credentials', 'tiny_v3_tokens', 'integration_secrets'];
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    FOR p IN SELECT policyname FROM pg_policies 
             WHERE schemaname='public' AND tablename=tbl 
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.%I', p, tbl);
    END LOOP;
  END LOOP;
END $$;

-- ========================================
-- PROFILES POLICIES
-- ========================================

CREATE POLICY "profiles: self or admin read"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR (public.has_permission('users:read') AND organizacao_id = public.get_current_org_id())
);

CREATE POLICY "profiles: self insert"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles: self update or admin manage"
ON public.profiles FOR UPDATE TO authenticated
USING (
  id = auth.uid()
  OR (public.has_permission('users:manage') AND organizacao_id = public.get_current_org_id())
)
WITH CHECK (
  id = auth.uid()
  OR (public.has_permission('users:manage') AND organizacao_id = public.get_current_org_id())
);

-- ========================================
-- INTEGRATION_ACCOUNTS POLICIES
-- ========================================

CREATE POLICY "ia: select by org"
ON public.integration_accounts FOR SELECT TO authenticated
USING (organization_id = public.get_current_org_id());

CREATE POLICY "ia: mutate by org with integrations:manage"
ON public.integration_accounts FOR ALL TO authenticated
USING (
  organization_id = public.get_current_org_id() 
  AND public.has_permission('integrations:manage')
)
WITH CHECK (
  organization_id = public.get_current_org_id() 
  AND public.has_permission('integrations:manage')
);

-- ========================================
-- PEDIDOS POLICIES
-- ========================================

CREATE POLICY "pedidos: select org + orders:read"
ON public.pedidos FOR SELECT TO authenticated
USING (
  public.has_permission('orders:read') AND
  EXISTS (
    SELECT 1 FROM public.integration_accounts ia
    WHERE ia.id = public.pedidos.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

-- ========================================
-- HISTORICO_VENDAS POLICIES
-- ========================================

CREATE POLICY "hv: select org + sales:read"
ON public.historico_vendas FOR SELECT TO authenticated
USING (
  public.has_permission('sales:read') AND
  EXISTS (
    SELECT 1 FROM public.integration_accounts ia
    WHERE ia.id = public.historico_vendas.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

-- ========================================
-- INVITATIONS POLICIES
-- ========================================

CREATE POLICY "invites: read if admin or own email"
ON public.invitations FOR SELECT TO authenticated
USING (
  (organization_id = public.get_current_org_id() AND public.has_permission('invites:read'))
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "invites: mutate by org with invites:manage"
ON public.invitations FOR ALL TO authenticated
USING (
  organization_id = public.get_current_org_id() 
  AND public.has_permission('invites:manage')
)
WITH CHECK (
  organization_id = public.get_current_org_id() 
  AND public.has_permission('invites:manage')
);

-- ========================================
-- ORGANIZACOES POLICIES
-- ========================================

CREATE POLICY "orgs: select current only"
ON public.organizacoes FOR SELECT TO authenticated
USING (id = public.get_current_org_id());

-- ========================================
-- SECRETS TABLES - DENY ALL POLICIES
-- ========================================

CREATE POLICY "tiny_v3_credentials: deny all"
ON public.tiny_v3_credentials FOR ALL TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "tiny_v3_tokens: deny all"
ON public.tiny_v3_tokens FOR ALL TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "integration_secrets: deny all"
ON public.integration_secrets FOR ALL TO anon, authenticated
USING (false)
WITH CHECK (false);

COMMIT;
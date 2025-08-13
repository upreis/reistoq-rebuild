-- RLS Hardening Phase 2B: profiles, integration_accounts, pedidos, historico_vendas, invitations
-- Ensuring proper security policies for sensitive data tables

-- 1. PROFILES - Self-read + admin access for team management
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Clear existing policies
DROP POLICY IF EXISTS "Usuários podem ver apenas sua própria organização" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem inserir seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "profiles: self read" ON public.profiles;

-- Self-read or admin read within org
CREATE POLICY "profiles: self or admin read"
ON public.profiles FOR SELECT
USING (
  id = auth.uid() 
  OR (
    public.has_permission('users:read') 
    AND organizacao_id = public.get_current_org_id()
  )
);

-- Self-update or admin manage within org
CREATE POLICY "profiles: self or admin update"
ON public.profiles FOR UPDATE
USING (
  id = auth.uid() 
  OR (
    public.has_permission('users:manage') 
    AND organizacao_id = public.get_current_org_id()
  )
);

-- Self-insert only
CREATE POLICY "profiles: self insert"
ON public.profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- 2. INTEGRATION_ACCOUNTS - Org-based with permissions for mutations
ALTER TABLE public.integration_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_accounts FORCE ROW LEVEL SECURITY;

-- Clear existing policies
DROP POLICY IF EXISTS "Contas por organização (SELECT)" ON public.integration_accounts;
DROP POLICY IF EXISTS "Contas por organização (INSERT)" ON public.integration_accounts;
DROP POLICY IF EXISTS "Contas por organização (UPDATE)" ON public.integration_accounts;
DROP POLICY IF EXISTS "Contas por organização (DELETE)" ON public.integration_accounts;

-- Read by org members
CREATE POLICY "ia: select org"
ON public.integration_accounts FOR SELECT
USING (organization_id = public.get_current_org_id());

-- Mutations require integrations:manage permission
CREATE POLICY "ia: insert manage"
ON public.integration_accounts FOR INSERT
WITH CHECK (
  organization_id = public.get_current_org_id() 
  AND public.has_permission('integrations:manage')
);

CREATE POLICY "ia: update manage"
ON public.integration_accounts FOR UPDATE
USING (
  organization_id = public.get_current_org_id() 
  AND public.has_permission('integrations:manage')
)
WITH CHECK (
  organization_id = public.get_current_org_id() 
  AND public.has_permission('integrations:manage')
);

CREATE POLICY "ia: delete manage"
ON public.integration_accounts FOR DELETE
USING (
  organization_id = public.get_current_org_id() 
  AND public.has_permission('integrations:manage')
);

-- 3. PEDIDOS - Via integration_accounts org check
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos FORCE ROW LEVEL SECURITY;

-- Clear existing policies
DROP POLICY IF EXISTS "Pedidos SELECT por org via integration_account" ON public.pedidos;
DROP POLICY IF EXISTS "Pedidos INSERT por org via integration_account" ON public.pedidos;
DROP POLICY IF EXISTS "Pedidos UPDATE por org via integration_account" ON public.pedidos;
DROP POLICY IF EXISTS "Pedidos DELETE por org via integration_account" ON public.pedidos;

-- Read via integration account org
CREATE POLICY "pedidos: select org"
ON public.pedidos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.integration_accounts ia
    WHERE ia.id = public.pedidos.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

-- Mutations via integration account org (if existing policies allow)
CREATE POLICY "pedidos: insert org"
ON public.pedidos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.integration_accounts ia
    WHERE ia.id = public.pedidos.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

CREATE POLICY "pedidos: update org"
ON public.pedidos FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.integration_accounts ia
    WHERE ia.id = public.pedidos.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.integration_accounts ia
    WHERE ia.id = public.pedidos.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

CREATE POLICY "pedidos: delete org"
ON public.pedidos FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.integration_accounts ia
    WHERE ia.id = public.pedidos.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

-- 4. HISTORICO_VENDAS - Same pattern as pedidos
ALTER TABLE public.historico_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_vendas FORCE ROW LEVEL SECURITY;

-- Clear existing policies including any permissive ones
DROP POLICY IF EXISTS "Histórico SELECT por org via integration_account" ON public.historico_vendas;
DROP POLICY IF EXISTS "Histórico INSERT por org via integration_account" ON public.historico_vendas;
DROP POLICY IF EXISTS "Histórico UPDATE por org via integration_account" ON public.historico_vendas;
DROP POLICY IF EXISTS "Histórico DELETE por org via integration_account" ON public.historico_vendas;
DROP POLICY IF EXISTS "Usuários autenticados podem acessar histórico" ON public.historico_vendas;

-- Read via integration account org
CREATE POLICY "hv: select org"
ON public.historico_vendas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.integration_accounts ia
    WHERE ia.id = public.historico_vendas.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

-- Mutations via integration account org
CREATE POLICY "hv: insert org"
ON public.historico_vendas FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.integration_accounts ia
    WHERE ia.id = public.historico_vendas.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

CREATE POLICY "hv: update org"
ON public.historico_vendas FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.integration_accounts ia
    WHERE ia.id = public.historico_vendas.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.integration_accounts ia
    WHERE ia.id = public.historico_vendas.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

CREATE POLICY "hv: delete org"
ON public.historico_vendas FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.integration_accounts ia
    WHERE ia.id = public.historico_vendas.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

-- 5. INVITATIONS - Contains emails, requires proper scoping
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations FORCE ROW LEVEL SECURITY;

-- Clear existing policies
DROP POLICY IF EXISTS "Invites SELECT por organização" ON public.invitations;
DROP POLICY IF EXISTS "Invites INSERT por organização" ON public.invitations;
DROP POLICY IF EXISTS "Invites UPDATE por organização" ON public.invitations;
DROP POLICY IF EXISTS "Invites DELETE por organização" ON public.invitations;

-- Read if admin with permission OR own invitation by email
CREATE POLICY "invites: select manage or own"
ON public.invitations FOR SELECT
USING (
  (
    organization_id = public.get_current_org_id() 
    AND public.has_permission('invites:read')
  )
  OR (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Insert/Update require permission
CREATE POLICY "invites: insert manage"
ON public.invitations FOR INSERT
WITH CHECK (
  organization_id = public.get_current_org_id() 
  AND public.has_permission('invites:manage')
);

CREATE POLICY "invites: update manage"
ON public.invitations FOR UPDATE
USING (
  organization_id = public.get_current_org_id() 
  AND public.has_permission('invites:manage')
)
WITH CHECK (
  organization_id = public.get_current_org_id() 
  AND public.has_permission('invites:manage')
);

CREATE POLICY "invites: delete manage"
ON public.invitations FOR DELETE
USING (
  organization_id = public.get_current_org_id() 
  AND public.has_permission('invites:manage')
);

-- Ensure service_role retains full access (no restrictions)
-- Grants for authenticated users are controlled via RLS policies above
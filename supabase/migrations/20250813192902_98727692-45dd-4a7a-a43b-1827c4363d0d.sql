BEGIN;

-- 0) Garantias de RLS + FORCE RLS
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY; ALTER TABLE public.profiles              FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invitations           ENABLE ROW LEVEL SECURITY; ALTER TABLE public.invitations           FORCE ROW LEVEL SECURITY;
ALTER TABLE public.integration_accounts  ENABLE ROW LEVEL SECURITY; ALTER TABLE public.integration_accounts  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.historico_vendas      ENABLE ROW LEVEL SECURITY; ALTER TABLE public.historico_vendas      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos               ENABLE ROW LEVEL SECURITY; ALTER TABLE public.pedidos               FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organizacoes          ENABLE ROW LEVEL SECURITY; ALTER TABLE public.organizacoes          FORCE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes         ENABLE ROW LEVEL SECURITY; ALTER TABLE public.configuracoes         FORCE ROW LEVEL SECURITY;

-- 1) Remover grants públicos
REVOKE ALL ON public.profiles             FROM PUBLIC, anon;
REVOKE ALL ON public.invitations          FROM PUBLIC, anon;
REVOKE ALL ON public.integration_accounts FROM PUBLIC, anon;
REVOKE ALL ON public.historico_vendas     FROM PUBLIC, anon;
REVOKE ALL ON public.pedidos              FROM PUBLIC, anon;
REVOKE ALL ON public.organizacoes         FROM PUBLIC, anon;
REVOKE ALL ON public.configuracoes        FROM PUBLIC, anon;

-- 2) Limpar policies antigas nessas tabelas
DO $$
DECLARE p text; t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles','invitations','integration_accounts','historico_vendas',
    'pedidos','organizacoes','configuracoes'
  ]
  LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.%I', p, t);
    END LOOP;
  END LOOP;
END $$;

-- 3) PROFILES — apenas o próprio usuário lê; admin só gerencia (UPDATE) na mesma org
CREATE POLICY "profiles: self read"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles: self insert"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles: self update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.app_permissions WHERE key='users:manage') THEN
    CREATE POLICY "profiles: admin manage same org"
      ON public.profiles FOR UPDATE TO authenticated
      USING ( public.has_permission('users:manage') AND organizacao_id = public.get_current_org_id() )
      WITH CHECK ( public.has_permission('users:manage') AND organizacao_id = public.get_current_org_id() );
  END IF;
END $$;

-- 4) INVITATIONS — ver só se for dono do e-mail ou admin da org com invites:read; mutar com invites:manage
CREATE POLICY "invites: select manage or own"
  ON public.invitations FOR SELECT TO authenticated
  USING (
    (organization_id = public.get_current_org_id() AND public.has_permission('invites:read'))
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "invites: mutate by org with invites:manage"
  ON public.invitations FOR ALL TO authenticated
  USING (organization_id = public.get_current_org_id() AND public.has_permission('invites:manage'))
  WITH CHECK (organization_id = public.get_current_org_id() AND public.has_permission('invites:manage'));

-- 5) ORGANIZACOES — só a org atual
CREATE POLICY "orgs: select current only"
  ON public.organizacoes FOR SELECT TO authenticated
  USING (id = public.get_current_org_id());

-- 6) INTEGRATION_ACCOUNTS — leitura exige permissão explícita e mesma org; mutar só manage
CREATE POLICY "ia: select org + integrations:read/manage"
  ON public.integration_accounts FOR SELECT TO authenticated
  USING (
    organization_id = public.get_current_org_id()
    AND (public.has_permission('integrations:read') OR public.has_permission('integrations:manage'))
  );

CREATE POLICY "ia: mutate by org with integrations:manage"
  ON public.integration_accounts FOR ALL TO authenticated
  USING (organization_id = public.get_current_org_id() AND public.has_permission('integrations:manage'))
  WITH CHECK (organization_id = public.get_current_org_id() AND public.has_permission('integrations:manage'));

-- 7) HISTORICO_VENDAS e PEDIDOS — bloquear SELECT direto (acesso somente via RPC/Edge)
CREATE POLICY "hv: deny select"
  ON public.historico_vendas FOR SELECT TO anon, authenticated
  USING (false);

CREATE POLICY "pedidos: deny select"
  ON public.pedidos FOR SELECT TO anon, authenticated
  USING (false);

-- 8) CONFIGURACOES — proteção básica (ler por org; alterar com settings:manage)
INSERT INTO public.app_permissions (key,name,description) VALUES
  ('settings:manage','Gerenciar configurações','Permite gerenciar configurações da organização')
ON CONFLICT (key) DO NOTHING;

CREATE POLICY "config: select by org"
  ON public.configuracoes FOR SELECT TO authenticated
  USING (organization_id = public.get_current_org_id());

CREATE POLICY "config: mutate by org with settings:manage"
  ON public.configuracoes FOR ALL TO authenticated
  USING (organization_id = public.get_current_org_id() AND public.has_permission('settings:manage'))
  WITH CHECK (organization_id = public.get_current_org_id() AND public.has_permission('settings:manage'));

COMMIT;
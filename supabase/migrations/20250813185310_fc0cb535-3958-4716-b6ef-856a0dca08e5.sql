BEGIN;

-- Garantias base
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY; ALTER TABLE public.profiles              FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invitations           ENABLE ROW LEVEL SECURITY; ALTER TABLE public.invitations           FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organizacoes          ENABLE ROW LEVEL SECURITY; ALTER TABLE public.organizacoes          FORCE ROW LEVEL SECURITY;
ALTER TABLE public.integration_accounts  ENABLE ROW LEVEL SECURITY; ALTER TABLE public.integration_accounts  FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.profiles             FROM PUBLIC, anon;
REVOKE ALL ON public.invitations          FROM PUBLIC, anon;
REVOKE ALL ON public.organizacoes         FROM PUBLIC, anon;
REVOKE ALL ON public.integration_accounts FROM PUBLIC, anon;

-- Limpar policies antigas
DO $$
DECLARE p text;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename IN
    ('profiles','invitations','organizacoes','integration_accounts')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.%I', p, (SELECT tablename FROM pg_policies WHERE policyname=p LIMIT 1));
  END LOOP;
END $$;

-- PROFILES
CREATE POLICY "profiles: self read"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles: admin read same org"
  ON public.profiles FOR SELECT TO authenticated
  USING ( public.has_permission('users:read') AND organizacao_id = public.get_current_org_id() );

CREATE POLICY "profiles: self insert"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles: self update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- opcional: admin pode gerenciar perfil na MESMA org
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.app_permissions WHERE key='users:manage') THEN
    CREATE POLICY "profiles: admin manage same org"
      ON public.profiles FOR UPDATE TO authenticated
      USING ( public.has_permission('users:manage') AND organizacao_id = public.get_current_org_id() )
      WITH CHECK ( public.has_permission('users:manage') AND organizacao_id = public.get_current_org_id() );
  END IF;
END $$;

-- INVITATIONS
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

-- ORGANIZACOES
CREATE POLICY "orgs: select current only"
  ON public.organizacoes FOR SELECT TO authenticated
  USING (id = public.get_current_org_id());

-- INTEGRATION_ACCOUNTS (sem segredos)
CREATE POLICY "ia: select by org"
  ON public.integration_accounts FOR SELECT TO authenticated
  USING (organization_id = public.get_current_org_id());

CREATE POLICY "ia: mutate by org with integrations:manage"
  ON public.integration_accounts FOR ALL TO authenticated
  USING (organization_id = public.get_current_org_id() AND public.has_permission('integrations:manage'))
  WITH CHECK (organization_id = public.get_current_org_id() AND public.has_permission('integrations:manage'));

COMMIT;
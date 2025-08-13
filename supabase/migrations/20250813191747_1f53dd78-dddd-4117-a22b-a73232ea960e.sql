BEGIN;

-- GARANTIAS
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY; ALTER TABLE public.profiles             FORCE ROW LEVEL SECURITY;
ALTER TABLE public.integration_accounts ENABLE ROW LEVEL SECURITY; ALTER TABLE public.integration_accounts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles FROM PUBLIC, anon;
REVOKE ALL ON public.integration_accounts FROM PUBLIC, anon;

-- LIMPAR POLICIES ANTIGAS
DO $$
DECLARE p text;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='profiles'
  LOOP EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.profiles', p); END LOOP;

  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='integration_accounts'
  LOOP EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.integration_accounts', p); END LOOP;
END $$;

-- PROFILES ► apenas o próprio usuário lê; admins NÃO têm SELECT amplo (fazem gestão via UPDATE/RPC)
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

-- Admin pode GERENCIAR (UPDATE) dentro da mesma org – sem SELECT amplo
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.app_permissions WHERE key = 'users:manage') THEN
    CREATE POLICY "profiles: admin manage same org"
      ON public.profiles FOR UPDATE TO authenticated
      USING ( public.has_permission('users:manage') AND organizacao_id = public.get_current_org_id() )
      WITH CHECK ( public.has_permission('users:manage') AND organizacao_id = public.get_current_org_id() );
  END IF;
END $$;

-- INTEGRATION_ACCOUNTS ► leitura só com permissão explícita + mesma org
CREATE POLICY "ia: select org + integrations:read/manage"
  ON public.integration_accounts FOR SELECT TO authenticated
  USING (
    organization_id = public.get_current_org_id()
    AND (public.has_permission('integrations:read') OR public.has_permission('integrations:manage'))
  );

-- mutações só pra quem gerencia integrações
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

COMMIT;
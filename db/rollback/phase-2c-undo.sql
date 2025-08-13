-- Rollback for Phase 2C: Permission-gated RLS
-- WARNING: This rollback does NOT reopen SELECT access to historico_vendas for authenticated users
-- The table remains protected and accessible only via RPC

BEGIN;

---------------------------
-- ROLLBACK PROFILES
---------------------------
DO $$
DECLARE p text;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='profiles' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.profiles', p);
  END LOOP;
END$$;

-- Restore previous policies (basic self-access)
CREATE POLICY "profiles: self or admin read"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR (has_permission('users:read'::text) AND (organizacao_id = get_current_org_id()))
  );

CREATE POLICY "profiles: self or admin update"
  ON public.profiles FOR UPDATE
  USING (
    id = auth.uid()
    OR (has_permission('users:manage'::text) AND (organizacao_id = get_current_org_id()))
  );

CREATE POLICY "profiles: self insert"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

---------------------------
-- ROLLBACK INTEGRATION_ACCOUNTS
---------------------------
DO $$
DECLARE p text;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='integration_accounts' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.integration_accounts', p);
  END LOOP;
END$$;

-- Restore basic org-level access
CREATE POLICY "ia: select org"
  ON public.integration_accounts FOR SELECT
  USING (organization_id = get_current_org_id());

CREATE POLICY "ia: insert manage"
  ON public.integration_accounts FOR INSERT
  WITH CHECK (organization_id = get_current_org_id() AND has_permission('integrations:manage'::text));

CREATE POLICY "ia: update manage"
  ON public.integration_accounts FOR UPDATE
  USING (organization_id = get_current_org_id() AND has_permission('integrations:manage'::text))
  WITH CHECK (organization_id = get_current_org_id() AND has_permission('integrations:manage'::text));

CREATE POLICY "ia: delete manage"
  ON public.integration_accounts FOR DELETE
  USING (organization_id = get_current_org_id() AND has_permission('integrations:manage'::text));

---------------------------
-- ROLLBACK PEDIDOS
---------------------------
DO $$
DECLARE p text;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='pedidos' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.pedidos', p);
  END LOOP;
END$$;

-- Restore previous policies
CREATE POLICY "pedidos: select org"
  ON public.pedidos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM integration_accounts ia
      WHERE ia.id = pedidos.integration_account_id
        AND ia.organization_id = get_current_org_id()
    )
  );

---------------------------
-- ROLLBACK HISTORICO_VENDAS
---------------------------
DO $$
DECLARE p text;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='historico_vendas' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.historico_vendas', p);
  END LOOP;
END$$;

-- IMPORTANT: Do NOT restore SELECT policy for authenticated
-- Keep only mutation policies by org (if needed)
CREATE POLICY "hv: insert org"
  ON public.historico_vendas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM integration_accounts ia
      WHERE ia.id = historico_vendas.integration_account_id
        AND ia.organization_id = get_current_org_id()
    )
  );

CREATE POLICY "hv: update org"
  ON public.historico_vendas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM integration_accounts ia
      WHERE ia.id = historico_vendas.integration_account_id
        AND ia.organization_id = get_current_org_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM integration_accounts ia
      WHERE ia.id = historico_vendas.integration_account_id
        AND ia.organization_id = get_current_org_id()
    )
  );

CREATE POLICY "hv: delete org"
  ON public.historico_vendas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM integration_accounts ia
      WHERE ia.id = historico_vendas.integration_account_id
        AND ia.organization_id = get_current_org_id()
    )
  );

---------------------------
-- ROLLBACK INVITATIONS
---------------------------
DO $$
DECLARE p text;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='invitations' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.invitations', p);
  END LOOP;
END$$;

-- Restore previous policies
CREATE POLICY "invites: select manage or own"
  ON public.invitations FOR SELECT
  USING (
    (organization_id = get_current_org_id() AND has_permission('invites:read'::text))
    OR (email = (SELECT email FROM auth.users WHERE id = auth.uid())::text)
  );

CREATE POLICY "invites: insert manage"
  ON public.invitations FOR INSERT
  WITH CHECK (organization_id = get_current_org_id() AND has_permission('invites:manage'::text));

CREATE POLICY "invites: update manage"
  ON public.invitations FOR UPDATE
  USING (organization_id = get_current_org_id() AND has_permission('invites:manage'::text))
  WITH CHECK (organization_id = get_current_org_id() AND has_permission('invites:manage'::text));

CREATE POLICY "invites: delete manage"
  ON public.invitations FOR DELETE
  USING (organization_id = get_current_org_id() AND has_permission('invites:manage'::text));

---------------------------
-- ROLLBACK ORGANIZACOES
---------------------------
DO $$
DECLARE p text;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='organizacoes' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.organizacoes', p);
  END LOOP;
END$$;

-- Restore previous policy
CREATE POLICY "Usuários podem ver apenas sua própria organização"
  ON public.organizacoes FOR SELECT
  USING (id IN (SELECT profiles.organizacao_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Usuários podem atualizar apenas sua própria organização"
  ON public.organizacoes FOR UPDATE
  USING (id IN (SELECT profiles.organizacao_id FROM profiles WHERE profiles.id = auth.uid()));

COMMIT;
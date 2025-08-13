-- Phase 2C: Permission-gated RLS with organization isolation
-- Also abolish direct frontend access to historico_vendas (read via RPC only)

BEGIN;

-- Helpers
CREATE EXTENSION IF NOT EXISTS pgcrypto;

---------------------------
-- 1) PROFILES
---------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

DO $$
DECLARE p text;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='profiles' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.profiles', p);
  END LOOP;
END$$;

CREATE POLICY "profiles: self or admin read"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR (public.has_permission('users:read') AND organizacao_id = public.get_current_org_id())
);

CREATE POLICY "profiles: self or admin update"
ON public.profiles FOR UPDATE TO authenticated
USING (
  id = auth.uid()
  OR (public.has_permission('users:manage') AND organizacao_id = public.get_current_org_id())
)
WITH CHECK (
  id = auth.uid()
  OR (public.has_permission('users:manage') AND organizacao_id = public.get_current_org_id())
);

CREATE POLICY "profiles: self insert"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

---------------------------
-- 2) INTEGRATION_ACCOUNTS (no secrets here)
---------------------------
ALTER TABLE public.integration_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_accounts FORCE ROW LEVEL SECURITY;

DO $$
DECLARE p text;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='integration_accounts' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.integration_accounts', p);
  END LOOP;
END$$;

CREATE POLICY "ia: select org"
ON public.integration_accounts FOR SELECT TO authenticated
USING (organization_id = public.get_current_org_id());

CREATE POLICY "ia: insert manage"
ON public.integration_accounts FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_current_org_id() AND public.has_permission('integrations:manage'));

CREATE POLICY "ia: update manage"
ON public.integration_accounts FOR UPDATE TO authenticated
USING (organization_id = public.get_current_org_id() AND public.has_permission('integrations:manage'))
WITH CHECK (organization_id = public.get_current_org_id() AND public.has_permission('integrations:manage'));

CREATE POLICY "ia: delete manage"
ON public.integration_accounts FOR DELETE TO authenticated
USING (organization_id = public.get_current_org_id() AND public.has_permission('integrations:manage'));

---------------------------
-- 3) PEDIDOS (financial): org + permission
---------------------------
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos FORCE ROW LEVEL SECURITY;

DO $$
DECLARE p text;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='pedidos' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.pedidos', p);
  END LOOP;
END$$;

CREATE POLICY "pedidos: select with permission"
ON public.pedidos FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.integration_accounts ia
    WHERE ia.id = public.pedidos.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
  AND public.has_permission('orders:read')
);

-- No INSERT/UPDATE/DELETE policies for authenticated (service_role edges only)

---------------------------
-- 4) HISTORICO_VENDAS (financial + PII): no SELECT for authenticated
---------------------------
ALTER TABLE public.historico_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_vendas FORCE ROW LEVEL SECURITY;

DO $$
DECLARE p text;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='historico_vendas' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.historico_vendas', p);
  END LOOP;
END$$;

-- Optional client mutations by org (keep if currently used; else remove later)
CREATE POLICY "hv: insert org"
ON public.historico_vendas FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.integration_accounts ia
    WHERE ia.id = public.historico_vendas.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

CREATE POLICY "hv: update org"
ON public.historico_vendas FOR UPDATE TO authenticated
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
ON public.historico_vendas FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.integration_accounts ia
    WHERE ia.id = public.historico_vendas.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

-- NOTE: intentionally NO SELECT policy for authenticated (forces RPC usage)

---------------------------
-- 5) INVITATIONS (emails)
---------------------------
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations FORCE ROW LEVEL SECURITY;

DO $$
DECLARE p text;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='invitations' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.invitations', p);
  END LOOP;
END$$;

CREATE POLICY "invites: select manage or own"
ON public.invitations FOR SELECT TO authenticated
USING (
  (organization_id = public.get_current_org_id() AND public.has_permission('invites:read'))
  OR (email = (SELECT email FROM auth.users WHERE id = auth.uid())::text)
);

CREATE POLICY "invites: insert manage"
ON public.invitations FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_current_org_id() AND public.has_permission('invites:manage'));

CREATE POLICY "invites: update manage"
ON public.invitations FOR UPDATE TO authenticated
USING (organization_id = public.get_current_org_id() AND public.has_permission('invites:manage'))
WITH CHECK (organization_id = public.get_current_org_id() AND public.has_permission('invites:manage'));

CREATE POLICY "invites: delete manage"
ON public.invitations FOR DELETE TO authenticated
USING (organization_id = public.get_current_org_id() AND public.has_permission('invites:manage'));

---------------------------
-- 6) ORGANIZACOES (close scanner finding)
---------------------------
ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizacoes FORCE ROW LEVEL SECURITY;

DO $$
DECLARE p text;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='organizacoes' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.organizacoes', p);
  END LOOP;
END$$;

CREATE POLICY "orgs: select current"
ON public.organizacoes FOR SELECT TO authenticated
USING (id = public.get_current_org_id());

COMMIT;
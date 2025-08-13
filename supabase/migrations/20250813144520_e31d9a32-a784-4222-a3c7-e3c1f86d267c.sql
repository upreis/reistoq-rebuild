BEGIN;

-- PROFILES: somente o próprio usuário ou admin da MESMA org
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles FROM PUBLIC, anon;

-- limpa policies antigas
DO $$
DECLARE p text;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname='public' AND tablename='profiles' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.profiles', p);
  END LOOP;
END $$;

-- SELECT: self OU admin com users:read dentro da mesma organização
CREATE POLICY "profiles: self or admin read"
ON public.profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR (public.has_permission('users:read')
      AND organizacao_id = public.get_current_org_id())
);

-- INSERT/UPDATE: apenas o próprio usuário
CREATE POLICY "profiles: self insert"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles: self update"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- PEDIDOS / HISTÓRICO (reforço – mantém como já aplicado)
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos FORCE ROW LEVEL SECURITY;
ALTER TABLE public.historico_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_vendas FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.pedidos FROM PUBLIC, anon;
REVOKE ALL ON public.historico_vendas FROM PUBLIC, anon;

-- garantir permissões registradas
INSERT INTO public.app_permissions (key,name,description) VALUES
('orders:read','Ler pedidos','Permite visualizar pedidos da organização'),
('sales:read','Ler histórico de vendas','Permite visualizar histórico de vendas da organização')
ON CONFLICT (key) DO NOTHING;

-- limpar e recriar SELECT por org + permissão
DO $$
DECLARE p text;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='pedidos'
  LOOP EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.pedidos', p); END LOOP;
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='historico_vendas'
  LOOP EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.historico_vendas', p); END LOOP;
END $$;

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

COMMIT;
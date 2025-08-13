BEGIN;

-- Garantias base
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos FORCE ROW LEVEL SECURITY;
ALTER TABLE public.historico_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_vendas FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.pedidos FROM PUBLIC, anon;
REVOKE ALL ON public.historico_vendas FROM PUBLIC, anon;

-- Limpar policies antigas
DO $$
DECLARE p text;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='pedidos' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.pedidos', p);
  END LOOP;
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='historico_vendas' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.historico_vendas', p);
  END LOOP;
END $$;

-- Permissões (idempotente)
INSERT INTO public.app_permissions (key, name, description)
VALUES ('orders:read','Ler pedidos','Permite visualizar pedidos da organização'),
       ('sales:read','Ler histórico de vendas','Permite visualizar histórico de vendas da organização')
ON CONFLICT (key) DO NOTHING;

-- SELECT por organização + permissão (pedidos)
CREATE POLICY "pedidos: select org + orders:read"
ON public.pedidos
FOR SELECT TO authenticated
USING (
  has_permission('orders:read')
  AND EXISTS (
    SELECT 1 FROM public.integration_accounts ia
    WHERE ia.id = public.pedidos.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

-- SELECT por organização + permissão (historico_vendas)
CREATE POLICY "hv: select org + sales:read"
ON public.historico_vendas
FOR SELECT TO authenticated
USING (
  has_permission('sales:read')
  AND EXISTS (
    SELECT 1 FROM public.integration_accounts ia
    WHERE ia.id = public.historico_vendas.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

COMMIT;
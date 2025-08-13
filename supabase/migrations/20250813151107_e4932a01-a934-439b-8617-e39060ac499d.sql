BEGIN;

-- 1) Habilitar e forçar RLS nas três tabelas
ALTER TABLE public.produtos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos                FORCE ROW LEVEL SECURITY;

ALTER TABLE public.itens_pedidos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_pedidos           FORCE ROW LEVEL SECURITY;

ALTER TABLE public.movimentacoes_estoque   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque   FORCE ROW LEVEL SECURITY;

-- 2) Limpar policies antigas
DO $$
DECLARE p text;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='produtos' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.produtos', p);
  END LOOP;

  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='itens_pedidos' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.itens_pedidos', p);
  END LOOP;

  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='movimentacoes_estoque' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.movimentacoes_estoque', p);
  END LOOP;
END $$;

-- 3) Policies por organização (leitura pelo app; mutações mantidas como já estiver)
-- PRODUTOS: por organization_id
CREATE POLICY "produtos: select org"
ON public.produtos
FOR SELECT TO authenticated
USING (organization_id = public.get_current_org_id());

-- Opcional (se o app precisar mutar produtos pelo cliente, mantenha por org)
CREATE POLICY "produtos: mutate org"
ON public.produtos
FOR ALL TO authenticated
USING (organization_id = public.get_current_org_id())
WITH CHECK (organization_id = public.get_current_org_id());

-- ITENS_PEDIDOS: escopo via pedido -> integration_accounts -> organization_id
CREATE POLICY "itens_pedidos: select org"
ON public.itens_pedidos
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pedidos p
    JOIN public.integration_accounts ia ON ia.id = p.integration_account_id
    WHERE p.id = public.itens_pedidos.pedido_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

-- Opcional: permitir mutações se o app usa (senão, omita estas)
CREATE POLICY "itens_pedidos: mutate org"
ON public.itens_pedidos
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pedidos p
    JOIN public.integration_accounts ia ON ia.id = p.integration_account_id
    WHERE p.id = public.itens_pedidos.pedido_id
      AND ia.organization_id = public.get_current_org_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.pedidos p
    JOIN public.integration_accounts ia ON ia.id = p.integration_account_id
    WHERE p.id = public.itens_pedidos.pedido_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

-- MOVIMENTACOES_ESTOQUE: escopo via produto -> organization_id
CREATE POLICY "mov_estoque: select org"
ON public.movimentacoes_estoque
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.produtos pr
    WHERE pr.id = public.movimentacoes_estoque.produto_id
      AND pr.organization_id = public.get_current_org_id()
  )
);

-- Opcional: mutações por org se o cliente precisa (senão, omita)
CREATE POLICY "mov_estoque: mutate org"
ON public.movimentacoes_estoque
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.produtos pr
    WHERE pr.id = public.movimentacoes_estoque.produto_id
      AND pr.organization_id = public.get_current_org_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.produtos pr
    WHERE pr.id = public.movimentacoes_estoque.produto_id
      AND pr.organization_id = public.get_current_org_id()
  )
);

COMMIT;
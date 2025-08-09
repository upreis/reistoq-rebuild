-- Isolar dados por organização usando a relação integration_accounts.organization_id
-- Produtos
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Produtos por organização" ON public.produtos;

CREATE POLICY "Produtos SELECT por org via integration_account"
ON public.produtos
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = public.produtos.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

CREATE POLICY "Produtos INSERT por org via integration_account"
ON public.produtos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = public.produtos.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

CREATE POLICY "Produtos UPDATE por org via integration_account"
ON public.produtos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = public.produtos.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = public.produtos.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

CREATE POLICY "Produtos DELETE por org via integration_account"
ON public.produtos
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = public.produtos.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

-- Pedidos
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Pedidos por organização" ON public.pedidos;
DROP POLICY IF EXISTS "Usuários podem atualizar pedidos da organização" ON public.pedidos;
DROP POLICY IF EXISTS "Usuários podem deletar pedidos da organização" ON public.pedidos;
DROP POLICY IF EXISTS "Usuários podem inserir pedidos da organização" ON public.pedidos;
DROP POLICY IF EXISTS "Usuários podem ver pedidos da organização" ON public.pedidos;

CREATE POLICY "Pedidos SELECT por org via integration_account"
ON public.pedidos
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = public.pedidos.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

CREATE POLICY "Pedidos INSERT por org via integration_account"
ON public.pedidos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = public.pedidos.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

CREATE POLICY "Pedidos UPDATE por org via integration_account"
ON public.pedidos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = public.pedidos.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = public.pedidos.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

CREATE POLICY "Pedidos DELETE por org via integration_account"
ON public.pedidos
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = public.pedidos.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

-- Itens de pedidos
ALTER TABLE public.itens_pedidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários podem atualizar itens de pedidos da organização" ON public.itens_pedidos;
DROP POLICY IF EXISTS "Usuários podem deletar itens de pedidos da organização" ON public.itens_pedidos;
DROP POLICY IF EXISTS "Usuários podem inserir itens de pedidos da organização" ON public.itens_pedidos;
DROP POLICY IF EXISTS "Usuários podem ver itens de pedidos da organização" ON public.itens_pedidos;

CREATE POLICY "Itens SELECT por org via integration_account"
ON public.itens_pedidos
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = public.itens_pedidos.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

CREATE POLICY "Itens INSERT por org via integration_account"
ON public.itens_pedidos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = public.itens_pedidos.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

CREATE POLICY "Itens UPDATE por org via integration_account"
ON public.itens_pedidos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = public.itens_pedidos.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = public.itens_pedidos.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

CREATE POLICY "Itens DELETE por org via integration_account"
ON public.itens_pedidos
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = public.itens_pedidos.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

-- Histórico de vendas
ALTER TABLE public.historico_vendas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários podem atualizar histórico de vendas da organização" ON public.historico_vendas;
DROP POLICY IF EXISTS "Usuários podem deletar histórico de vendas da organização" ON public.historico_vendas;
DROP POLICY IF EXISTS "Usuários podem inserir histórico de vendas da organização" ON public.historico_vendas;
DROP POLICY IF EXISTS "Usuários podem ver histórico de vendas da organização" ON public.historico_vendas;

CREATE POLICY "Histórico SELECT por org via integration_account"
ON public.historico_vendas
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = public.historico_vendas.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

CREATE POLICY "Histórico INSERT por org via integration_account"
ON public.historico_vendas
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = public.historico_vendas.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

CREATE POLICY "Histórico UPDATE por org via integration_account"
ON public.historico_vendas
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = public.historico_vendas.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = public.historico_vendas.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

CREATE POLICY "Histórico DELETE por org via integration_account"
ON public.historico_vendas
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = public.historico_vendas.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

-- Ajuste de RLS para permitir uploads sem integration_account_id em produtos

-- Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Produtos DELETE por org via integration_account" ON public.produtos;
DROP POLICY IF EXISTS "Produtos INSERT por org via integration_account" ON public.produtos;
DROP POLICY IF EXISTS "Produtos SELECT por org via integration_account" ON public.produtos;
DROP POLICY IF EXISTS "Produtos UPDATE por org via integration_account" ON public.produtos;

-- Política SELECT: permitir visualizar produtos sem integration_account_id ou vinculados à org atual
CREATE POLICY "Produtos SELECT por org ou sem conta"
ON public.produtos
FOR SELECT
USING (
  -- Produtos sem conta de integração
  produtos.integration_account_id IS NULL
  OR
  -- Produtos vinculados a uma conta de integração da organização atual
  EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = produtos.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

-- Política INSERT: permitir inserir produtos com integration_account_id nulo OU pertencente à org
CREATE POLICY "Produtos INSERT por org ou sem conta"
ON public.produtos
FOR INSERT
WITH CHECK (
  NEW.integration_account_id IS NULL
  OR EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = NEW.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

-- Política UPDATE: permitir atualizar produtos visíveis pelas mesmas regras
CREATE POLICY "Produtos UPDATE por org ou sem conta"
ON public.produtos
FOR UPDATE
USING (
  produtos.integration_account_id IS NULL
  OR EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = produtos.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
)
WITH CHECK (
  NEW.integration_account_id IS NULL
  OR EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = NEW.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

-- Política DELETE: permitir deletar dentro do mesmo escopo
CREATE POLICY "Produtos DELETE por org ou sem conta"
ON public.produtos
FOR DELETE
USING (
  produtos.integration_account_id IS NULL
  OR EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = produtos.integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

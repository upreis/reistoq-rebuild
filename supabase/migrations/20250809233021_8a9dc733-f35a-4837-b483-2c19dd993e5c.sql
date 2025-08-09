-- Corrigir RLS de produtos (sem usar NEW em policies)

-- Garantir remoção de policies antigas
DROP POLICY IF EXISTS "Produtos DELETE por org via integration_account" ON public.produtos;
DROP POLICY IF EXISTS "Produtos INSERT por org via integration_account" ON public.produtos;
DROP POLICY IF EXISTS "Produtos SELECT por org via integration_account" ON public.produtos;
DROP POLICY IF EXISTS "Produtos UPDATE por org via integration_account" ON public.produtos;
DROP POLICY IF EXISTS "Produtos SELECT por org ou sem conta" ON public.produtos;
DROP POLICY IF EXISTS "Produtos INSERT por org ou sem conta" ON public.produtos;
DROP POLICY IF EXISTS "Produtos UPDATE por org ou sem conta" ON public.produtos;
DROP POLICY IF EXISTS "Produtos DELETE por org ou sem conta" ON public.produtos;

-- SELECT
CREATE POLICY "Produtos SELECT por org ou sem conta"
ON public.produtos
FOR SELECT
USING (
  integration_account_id IS NULL
  OR EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

-- INSERT
CREATE POLICY "Produtos INSERT por org ou sem conta"
ON public.produtos
FOR INSERT
WITH CHECK (
  integration_account_id IS NULL
  OR EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

-- UPDATE
CREATE POLICY "Produtos UPDATE por org ou sem conta"
ON public.produtos
FOR UPDATE
USING (
  integration_account_id IS NULL
  OR EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
)
WITH CHECK (
  integration_account_id IS NULL
  OR EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

-- DELETE
CREATE POLICY "Produtos DELETE por org ou sem conta"
ON public.produtos
FOR DELETE
USING (
  integration_account_id IS NULL
  OR EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.id = integration_account_id
      AND ia.organization_id = public.get_current_org_id()
  )
);

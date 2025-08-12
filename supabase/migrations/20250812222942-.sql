-- 1) Add organization_id to produtos
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- 2) Backfill organization_id from integration_accounts where possible
UPDATE public.produtos p
SET organization_id = ia.organization_id
FROM public.integration_accounts ia
WHERE p.integration_account_id IS NOT NULL
  AND p.integration_account_id = ia.id
  AND p.organization_id IS NULL;

-- 3) Function to set organization_id on insert based on current user org
CREATE OR REPLACE FUNCTION public.set_produtos_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id = public.get_current_org_id();
  END IF;
  RETURN NEW;
END;
$$;

-- 4) Trigger for insert
DROP TRIGGER IF EXISTS trg_set_produtos_org ON public.produtos;
CREATE TRIGGER trg_set_produtos_org
BEFORE INSERT ON public.produtos
FOR EACH ROW
EXECUTE FUNCTION public.set_produtos_organization();

-- 5) Ensure RLS enabled
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- 6) Drop overly permissive policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'produtos' AND policyname = 'Produtos SELECT por org ou sem conta'
  ) THEN
    DROP POLICY "Produtos SELECT por org ou sem conta" ON public.produtos;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'produtos' AND policyname = 'Produtos INSERT por org ou sem conta'
  ) THEN
    DROP POLICY "Produtos INSERT por org ou sem conta" ON public.produtos;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'produtos' AND policyname = 'Produtos UPDATE por org ou sem conta'
  ) THEN
    DROP POLICY "Produtos UPDATE por org ou sem conta" ON public.produtos;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'produtos' AND policyname = 'Produtos DELETE por org ou sem conta'
  ) THEN
    DROP POLICY "Produtos DELETE por org ou sem conta" ON public.produtos;
  END IF;
END $$;

-- 7) Secure policies: only current org members can access
CREATE POLICY "produtos: select by org"
ON public.produtos
FOR SELECT
USING (
  (organization_id = public.get_current_org_id())
  OR (
    integration_account_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.integration_accounts ia
      WHERE ia.id = produtos.integration_account_id
        AND ia.organization_id = public.get_current_org_id()
    )
  )
);

CREATE POLICY "produtos: insert by org"
ON public.produtos
FOR INSERT
WITH CHECK (
  organization_id = public.get_current_org_id()
);

CREATE POLICY "produtos: update by org"
ON public.produtos
FOR UPDATE
USING (
  (organization_id = public.get_current_org_id())
  OR (
    integration_account_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.integration_accounts ia
      WHERE ia.id = produtos.integration_account_id
        AND ia.organization_id = public.get_current_org_id()
    )
  )
)
WITH CHECK (
  organization_id = public.get_current_org_id()
);

CREATE POLICY "produtos: delete by org"
ON public.produtos
FOR DELETE
USING (
  (organization_id = public.get_current_org_id())
  OR (
    integration_account_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.integration_accounts ia
      WHERE ia.id = produtos.integration_account_id
        AND ia.organization_id = public.get_current_org_id()
    )
  )
);

-- 8) Helpful index
CREATE INDEX IF NOT EXISTS idx_produtos_organization_id ON public.produtos(organization_id);

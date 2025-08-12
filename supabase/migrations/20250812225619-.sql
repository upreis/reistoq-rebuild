-- Secure historico_vendas_public with RLS and org-scoped SELECT policy
BEGIN;

-- Enable and enforce RLS on the table
ALTER TABLE public.historico_vendas_public ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_vendas_public FORCE ROW LEVEL SECURITY;

-- Ensure any previous policy with the same name is replaced safely
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'historico_vendas_public' 
      AND policyname = 'historico_vendas_public: org read via hv'
  ) THEN
    EXECUTE 'DROP POLICY "historico_vendas_public: org read via hv" ON public.historico_vendas_public';
  END IF;
END$$;

-- Allow SELECT only for rows that belong to the current user's organization
CREATE POLICY "historico_vendas_public: org read via hv"
ON public.historico_vendas_public
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.historico_vendas hv
    JOIN public.integration_accounts ia ON ia.id = hv.integration_account_id
    WHERE hv.id = public.historico_vendas_public.id
      AND ia.organization_id = public.get_current_org_id()
  )
);

-- Do not create INSERT/UPDATE/DELETE policies (implicit deny)

COMMIT;
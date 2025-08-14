-- Fix missing permissions for integrations and add missing permissions to admin role
INSERT INTO public.role_permissions (role_id, permission_key)
SELECT 
  r.id as role_id,
  ap.key as permission_key
FROM public.roles r
CROSS JOIN (
  SELECT 'integrations:read' as key
  UNION ALL SELECT 'integrations:manage'
  UNION ALL SELECT 'vendas:view_pii'
) ap
WHERE r.slug = 'admin' 
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_key = ap.key
  );

-- Update integration_accounts RLS policies to be less restrictive
DROP POLICY IF EXISTS "ia: select org + integrations:read/manage" ON public.integration_accounts;
DROP POLICY IF EXISTS "ia: mutate by org with integrations:manage" ON public.integration_accounts;

CREATE POLICY "integration_accounts: select by org" ON public.integration_accounts
  FOR SELECT USING (organization_id = public.get_current_org_id());

CREATE POLICY "integration_accounts: mutate by org with integrations:manage" ON public.integration_accounts
  FOR ALL USING (
    organization_id = public.get_current_org_id() 
    AND public.has_permission('integrations:manage')
  )
  WITH CHECK (
    organization_id = public.get_current_org_id() 
    AND public.has_permission('integrations:manage')
  );
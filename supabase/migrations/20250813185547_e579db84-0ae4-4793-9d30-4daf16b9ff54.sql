-- Fix profiles RLS to prevent unauthorized access to sensitive data
DROP POLICY IF EXISTS "profiles: admin read same org" ON public.profiles;

-- More restrictive admin access: only for user management, not general reading
CREATE POLICY "profiles: admin manage same org" 
  ON public.profiles FOR SELECT TO authenticated
  USING (
    -- Only allow admin access for user management operations AND in same org
    organizacao_id = public.get_current_org_id() 
    AND public.has_permission('users:manage')
    AND id != auth.uid() -- Admins use self policy for their own data
  );
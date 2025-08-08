-- Fix linter: set search_path on SECURITY DEFINER and other functions
CREATE OR REPLACE FUNCTION public.get_current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT organizacao_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_permissions()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
WITH org AS (
  SELECT public.get_current_org_id() AS org_id
),
role_perms AS (
  SELECT rp.permission_key
  FROM public.user_role_assignments ura
  JOIN public.roles r ON r.id = ura.role_id
  JOIN public.role_permissions rp ON rp.role_id = r.id
  CROSS JOIN org
  WHERE ura.user_id = auth.uid()
    AND r.organization_id = org.org_id
),
allows AS (
  SELECT permission_key FROM public.user_permission_overrides, org
  WHERE user_id = auth.uid() AND organization_id = org.org_id AND allow = true
),
disallows AS (
  SELECT permission_key FROM public.user_permission_overrides, org
  WHERE user_id = auth.uid() AND organization_id = org.org_id AND allow = false
)
SELECT COALESCE(
  ARRAY(
    SELECT DISTINCT p FROM (
      SELECT permission_key AS p FROM role_perms
      UNION ALL
      SELECT permission_key FROM allows
    ) s
    EXCEPT
    SELECT permission_key FROM disallows
    ORDER BY 1
  ),
  ARRAY[]::text[]
);
$$;

CREATE OR REPLACE FUNCTION public.has_permission(permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT permission_key = ANY(public.get_user_permissions());
$$;

CREATE OR REPLACE FUNCTION public.seed_admin_role_for_org(_org_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_role_id uuid;
BEGIN
  -- create role if not exists
  INSERT INTO public.roles (organization_id, name, slug, is_system)
  VALUES (_org_id, 'Administrador', 'admin', true)
  ON CONFLICT (organization_id, slug) DO NOTHING;

  SELECT id INTO admin_role_id FROM public.roles WHERE organization_id = _org_id AND slug = 'admin';

  -- grant ALL permissions to admin
  INSERT INTO public.role_permissions (role_id, permission_key)
  SELECT admin_role_id, ap.key FROM public.app_permissions ap
  ON CONFLICT (role_id, permission_key) DO NOTHING;

  -- assign current user to admin role
  INSERT INTO public.user_role_assignments (user_id, role_id, organization_id)
  VALUES (_user_id, admin_role_id, _org_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_roles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
-- Add manage invitations permission and grant to admin roles
BEGIN;

-- 1) Ensure the permission exists
INSERT INTO public.app_permissions (key, name)
SELECT 'configuracoes:manage_invitations', 'Gerenciar convites'
WHERE NOT EXISTS (
  SELECT 1 FROM public.app_permissions WHERE key = 'configuracoes:manage_invitations'
);

-- 2) Grant the permission to all admin roles
INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, 'configuracoes:manage_invitations'
FROM public.roles r
WHERE r.slug = 'admin'
ON CONFLICT DO NOTHING;

COMMIT;
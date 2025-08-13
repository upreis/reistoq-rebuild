-- Ensure admin role has the required permissions
INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, 'orders:read'
FROM public.roles r 
WHERE r.slug = 'admin'
ON CONFLICT (role_id, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, 'sales:read'
FROM public.roles r 
WHERE r.slug = 'admin'
ON CONFLICT (role_id, permission_key) DO NOTHING;
-- Seed base permissions
INSERT INTO public.app_permissions (key, name, description) VALUES
  ('dashboard:view','Ver Dashboard','Acessar o dashboard'),
  ('estoque:view','Ver Estoque','Ver listagens e detalhes de estoque'),
  ('estoque:create','Criar Produto','Criar novos produtos'),
  ('estoque:edit','Editar Estoque','Editar produtos e movimentações'),
  ('estoque:delete','Excluir Estoque','Excluir produtos e movimentações'),
  ('pedidos:view','Ver Pedidos','Acessar pedidos'),
  ('pedidos:edit','Editar Pedidos','Editar dados de pedidos'),
  ('pedidos:process','Processar Pedidos','Processar/avançar pedidos'),
  ('depara:view','Ver De/Para','Acessar mapeamentos De/Para'),
  ('depara:create','Criar De/Para','Criar novos mapeamentos De/Para'),
  ('depara:edit','Editar De/Para','Editar mapeamentos De/Para'),
  ('depara:delete','Excluir De/Para','Excluir mapeamentos De/Para'),
  ('historico:view','Ver Histórico','Acessar histórico do sistema'),
  ('scanner:use','Usar Scanner','Usar scanner de código de barras'),
  ('configuracoes:view','Ver Configurações','Acessar a área de configurações'),
  ('configuracoes:manage_roles','Gerir Papéis','Gerenciar papéis e permissões')
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name;

-- Create default roles per organization
WITH orgs AS (
  SELECT id FROM public.organizacoes
)
INSERT INTO public.roles (organization_id, name, slug, is_system)
SELECT id, 'Administrador', 'admin', true FROM orgs
ON CONFLICT (organization_id, slug) DO NOTHING;

WITH orgs AS (
  SELECT id FROM public.organizacoes
)
INSERT INTO public.roles (organization_id, name, slug, is_system)
SELECT id, 'Gerente', 'manager', false FROM orgs
ON CONFLICT (organization_id, slug) DO NOTHING;

WITH orgs AS (
  SELECT id FROM public.organizacoes
)
INSERT INTO public.roles (organization_id, name, slug, is_system)
SELECT id, 'Vendedor', 'seller', false FROM orgs
ON CONFLICT (organization_id, slug) DO NOTHING;

WITH orgs AS (
  SELECT id FROM public.organizacoes
)
INSERT INTO public.roles (organization_id, name, slug, is_system)
SELECT id, 'Operador', 'operator', false FROM orgs
ON CONFLICT (organization_id, slug) DO NOTHING;

WITH orgs AS (
  SELECT id FROM public.organizacoes
)
INSERT INTO public.roles (organization_id, name, slug, is_system)
SELECT id, 'Leitor', 'viewer', false FROM orgs
ON CONFLICT (organization_id, slug) DO NOTHING;

-- Assign permissions: admin gets all
INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, ap.key
FROM public.roles r
CROSS JOIN public.app_permissions ap
WHERE r.slug = 'admin'
ON CONFLICT DO NOTHING;

-- Manager
INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, v.p
FROM public.roles r
JOIN LATERAL (
  VALUES
    ('dashboard:view'),
    ('estoque:view'), ('estoque:create'), ('estoque:edit'), ('estoque:delete'),
    ('pedidos:view'), ('pedidos:edit'), ('pedidos:process'),
    ('depara:view'), ('depara:create'), ('depara:edit'), ('depara:delete'),
    ('historico:view'), ('scanner:use'), ('configuracoes:view')
) AS v(p) ON TRUE
WHERE r.slug = 'manager'
ON CONFLICT DO NOTHING;

-- Seller
INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, v.p
FROM public.roles r
JOIN LATERAL (
  VALUES
    ('dashboard:view'),
    ('pedidos:view'), ('pedidos:process'),
    ('historico:view'), ('scanner:use')
) AS v(p) ON TRUE
WHERE r.slug = 'seller'
ON CONFLICT DO NOTHING;

-- Operator
INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, v.p
FROM public.roles r
JOIN LATERAL (
  VALUES
    ('dashboard:view'),
    ('estoque:view'), ('estoque:edit'),
    ('historico:view'), ('scanner:use')
) AS v(p) ON TRUE
WHERE r.slug = 'operator'
ON CONFLICT DO NOTHING;

-- Viewer
INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, v.p
FROM public.roles r
JOIN LATERAL (
  VALUES
    ('dashboard:view'),
    ('estoque:view'), ('pedidos:view'), ('depara:view'), ('historico:view'), ('scanner:use')
) AS v(p) ON TRUE
WHERE r.slug = 'viewer'
ON CONFLICT DO NOTHING;

-- Ensure existing users are admins in their org (idempotent)
SELECT public.seed_admin_role_for_org(p.organizacao_id, p.id)
FROM public.profiles p
WHERE p.organizacao_id IS NOT NULL;
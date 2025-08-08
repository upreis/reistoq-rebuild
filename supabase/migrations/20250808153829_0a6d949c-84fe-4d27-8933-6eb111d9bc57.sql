-- RBAC dynamic schema: permissions, roles, role_permissions, user assignments, overrides

-- 1) Permissions catalog (global)
CREATE TABLE IF NOT EXISTS public.app_permissions (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text
);

ALTER TABLE public.app_permissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_permissions' AND policyname = 'Authenticated can view permissions'
  ) THEN
    CREATE POLICY "Authenticated can view permissions"
    ON public.app_permissions
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- Seed base permissions (idempotent)
INSERT INTO public.app_permissions (key, name, description) VALUES
  ('dashboard:view', 'Ver Dashboard', 'Acessar o dashboard'),
  ('estoque:view', 'Ver Estoque', 'Visualizar produtos e estoque'),
  ('estoque:edit', 'Editar Estoque', 'Criar/editar movimentações e produtos'),
  ('pedidos:view', 'Ver Pedidos', 'Visualizar pedidos'),
  ('pedidos:edit', 'Editar Pedidos', 'Criar/editar pedidos'),
  ('depara:view', 'Ver SKU Mapa (DE/PARA)', 'Visualizar mapeamentos'),
  ('depara:edit', 'Editar SKU Mapa (DE/PARA)', 'Criar/editar mapeamentos'),
  ('scanner:use', 'Usar Scanner', 'Acessar leitor de códigos'),
  ('historico:view', 'Ver Histórico', 'Visualizar histórico'),
  ('configuracoes:view', 'Ver Configurações', 'Acessar página de configurações'),
  ('configuracoes:manage_roles', 'Gerenciar Cargos/Permissões', 'Criar cargos e definir permissões')
ON CONFLICT (key) DO NOTHING;

-- 2) Roles por organização
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug),
  UNIQUE (organization_id, name)
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_roles_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_roles_updated_at ON public.roles;
CREATE TRIGGER trg_update_roles_updated_at
BEFORE UPDATE ON public.roles
FOR EACH ROW EXECUTE FUNCTION public.update_roles_updated_at();

-- 3) Role permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES public.app_permissions(key),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_key)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- 4) User role assignments (por organização)
CREATE TABLE IF NOT EXISTS public.user_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_id)
);

ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;

-- 5) User permission overrides (por usuário e organização)
CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  permission_key text NOT NULL REFERENCES public.app_permissions(key),
  allow boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id, permission_key)
);

ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's org
CREATE OR REPLACE FUNCTION public.get_current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT organizacao_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 6) RLS policies
-- roles
DROP POLICY IF EXISTS "Roles por organização (SELECT)" ON public.roles;
DROP POLICY IF EXISTS "Roles por organização (INSERT)" ON public.roles;
DROP POLICY IF EXISTS "Roles por organização (UPDATE)" ON public.roles;
DROP POLICY IF EXISTS "Roles por organização (DELETE)" ON public.roles;

CREATE POLICY "Roles por organização (SELECT)"
ON public.roles FOR SELECT TO authenticated
USING (organization_id = public.get_current_org_id());

CREATE POLICY "Roles por organização (INSERT)"
ON public.roles FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_current_org_id());

CREATE POLICY "Roles por organização (UPDATE)"
ON public.roles FOR UPDATE TO authenticated
USING (organization_id = public.get_current_org_id())
WITH CHECK (organization_id = public.get_current_org_id());

CREATE POLICY "Roles por organização (DELETE)"
ON public.roles FOR DELETE TO authenticated
USING (organization_id = public.get_current_org_id());

-- role_permissions
DROP POLICY IF EXISTS "Role permissions por organização (ALL)" ON public.role_permissions;
CREATE POLICY "Role permissions por organização (ALL)"
ON public.role_permissions FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.roles r
  WHERE r.id = role_permissions.role_id AND r.organization_id = public.get_current_org_id()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.roles r
  WHERE r.id = role_permissions.role_id AND r.organization_id = public.get_current_org_id()
));

-- user_role_assignments
DROP POLICY IF EXISTS "User role assignments por organização (SELECT)" ON public.user_role_assignments;
DROP POLICY IF EXISTS "User role assignments por organização (MUTATE)" ON public.user_role_assignments;

CREATE POLICY "User role assignments por organização (SELECT)"
ON public.user_role_assignments FOR SELECT TO authenticated
USING (organization_id = public.get_current_org_id());

CREATE POLICY "User role assignments por organização (MUTATE)"
ON public.user_role_assignments FOR ALL TO authenticated
USING (organization_id = public.get_current_org_id())
WITH CHECK (
  organization_id = public.get_current_org_id() AND
  EXISTS (
    SELECT 1 FROM public.roles r WHERE r.id = user_role_assignments.role_id AND r.organization_id = public.get_current_org_id()
  )
);

-- user_permission_overrides
DROP POLICY IF EXISTS "Overrides por organização (ALL)" ON public.user_permission_overrides;
CREATE POLICY "Overrides por organização (ALL)"
ON public.user_permission_overrides FOR ALL TO authenticated
USING (organization_id = public.get_current_org_id())
WITH CHECK (organization_id = public.get_current_org_id());

-- 7) Aggregate permissions for current user
CREATE OR REPLACE FUNCTION public.get_user_permissions()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
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
AS $$
  SELECT permission_key = ANY(public.get_user_permissions());
$$;

-- 8) Seed default admin role on onboarding
CREATE OR REPLACE FUNCTION public.seed_admin_role_for_org(_org_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Update complete_onboarding to seed admin role
CREATE OR REPLACE FUNCTION public.complete_onboarding(org_nome text, org_cnpj text, user_nome text, user_cargo text, tiny_token text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  new_org_id UUID;
  result JSON;
BEGIN
  -- Obter ID do usuário atual
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN '{"error": "Usuário não autenticado"}'::JSON;
  END IF;

  -- Inserir organização
  INSERT INTO public.organizacoes (nome, cnpj, plano)
  VALUES (org_nome, NULLIF(org_cnpj, ''), 'basico')
  RETURNING id INTO new_org_id;

  -- Atualizar perfil do usuário
  UPDATE public.profiles 
  SET nome_completo = user_nome,
      cargo = user_cargo,
      organizacao_id = new_org_id,
      updated_at = now()
  WHERE id = current_user_id;

  -- Limpar configurações existentes que podem estar conflitando
  DELETE FROM public.configuracoes WHERE chave IN ('tiny_token', 'alertas_email', 'onboarding_completo');

  -- Inserir configurações
  INSERT INTO public.configuracoes (chave, valor) VALUES
  ('tiny_token', COALESCE(tiny_token, '')),
  ('alertas_email', 'true'),
  ('onboarding_completo', 'true');

  -- RBAC: criar cargo Administrador e conceder permissões
  PERFORM public.seed_admin_role_for_org(new_org_id, current_user_id);

  -- Retornar sucesso
  result := json_build_object(
    'success', true,
    'organizacao_id', new_org_id,
    'user_id', current_user_id
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$function$;

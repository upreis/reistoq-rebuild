-- Phase 1: Isolar configuracoes por organização e hardening de RBAC + tabelas auxiliares

-- 1) Schema: configuracoes
ALTER TABLE public.configuracoes
  ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Remover chave sensível antiga
DELETE FROM public.configuracoes WHERE chave = 'tiny_token';

-- Índice único parcial por organização + chave (apenas quando organization_id não é nulo)
CREATE UNIQUE INDEX IF NOT EXISTS uq_config_org_key
  ON public.configuracoes(organization_id, chave)
  WHERE organization_id IS NOT NULL;

-- Garantir RLS habilitado
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas permissivas
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='configuracoes' AND policyname='Usuários podem ver configurações da sua organização') THEN
    DROP POLICY "Usuários podem ver configurações da sua organização" ON public.configuracoes;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='configuracoes' AND policyname='Usuários podem inserir configurações para sua organização') THEN
    DROP POLICY "Usuários podem inserir configurações para sua organização" ON public.configuracoes;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='configuracoes' AND policyname='Usuários podem atualizar configurações da sua organização') THEN
    DROP POLICY "Usuários podem atualizar configurações da sua organização" ON public.configuracoes;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='configuracoes' AND policyname='Usuários podem deletar configurações da sua organização') THEN
    DROP POLICY "Usuários podem deletar configurações da sua organização" ON public.configuracoes;
  END IF;
END $$;

-- Novas políticas mais estritas
CREATE POLICY "configuracoes: select by org"
  ON public.configuracoes
  FOR SELECT
  USING (organization_id = public.get_current_org_id());

-- Bloquear inserir/atualizar a chave sensível 'tiny_token'
CREATE POLICY "configuracoes: insert by managers (no tiny_token)"
  ON public.configuracoes
  FOR INSERT
  WITH CHECK (
    organization_id = public.get_current_org_id()
    AND public.has_permission('settings:manage')
    AND chave <> 'tiny_token'
  );

CREATE POLICY "configuracoes: update by managers (no tiny_token)"
  ON public.configuracoes
  FOR UPDATE
  USING (
    organization_id = public.get_current_org_id()
    AND public.has_permission('settings:manage')
  )
  WITH CHECK (
    organization_id = public.get_current_org_id()
    AND public.has_permission('settings:manage')
    AND chave <> 'tiny_token'
  );

CREATE POLICY "configuracoes: delete by managers"
  ON public.configuracoes
  FOR DELETE
  USING (
    organization_id = public.get_current_org_id()
    AND public.has_permission('settings:manage')
  );

-- 2) RBAC hardening
-- Roles
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='roles' AND policyname='Roles por organização (SELECT)') THEN
    DROP POLICY "Roles por organização (SELECT)" ON public.roles;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='roles' AND policyname='Roles por organização (INSERT)') THEN
    DROP POLICY "Roles por organização (INSERT)" ON public.roles;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='roles' AND policyname='Roles por organização (UPDATE)') THEN
    DROP POLICY "Roles por organização (UPDATE)" ON public.roles;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='roles' AND policyname='Roles por organização (DELETE)') THEN
    DROP POLICY "Roles por organização (DELETE)" ON public.roles;
  END IF;
END $$;

CREATE POLICY "roles: select by org"
  ON public.roles
  FOR SELECT
  USING (organization_id = public.get_current_org_id());

CREATE POLICY "roles: mutate by managers"
  ON public.roles
  FOR ALL
  USING (
    organization_id = public.get_current_org_id()
    AND public.has_permission('configuracoes:manage_roles')
  )
  WITH CHECK (
    organization_id = public.get_current_org_id()
    AND public.has_permission('configuracoes:manage_roles')
  );

-- Role permissions
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='role_permissions' AND policyname='Role permissions por organização (ALL)') THEN
    DROP POLICY "Role permissions por organização (ALL)" ON public.role_permissions;
  END IF;
END $$;

CREATE POLICY "role_permissions: select by org"
  ON public.role_permissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.organization_id = public.get_current_org_id()
    )
  );

CREATE POLICY "role_permissions: mutate by managers"
  ON public.role_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.organization_id = public.get_current_org_id()
    )
    AND public.has_permission('configuracoes:manage_roles')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.organization_id = public.get_current_org_id()
    )
    AND public.has_permission('configuracoes:manage_roles')
  );

-- User role assignments
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_role_assignments' AND policyname='User role assignments por organização (SELECT)') THEN
    DROP POLICY "User role assignments por organização (SELECT)" ON public.user_role_assignments;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_role_assignments' AND policyname='User role assignments por organização (MUTATE)') THEN
    DROP POLICY "User role assignments por organização (MUTATE)" ON public.user_role_assignments;
  END IF;
END $$;

CREATE POLICY "user_role_assignments: select by org"
  ON public.user_role_assignments
  FOR SELECT
  USING (organization_id = public.get_current_org_id());

CREATE POLICY "user_role_assignments: mutate by managers"
  ON public.user_role_assignments
  FOR ALL
  USING (
    organization_id = public.get_current_org_id()
    AND public.has_permission('configuracoes:manage_roles')
    AND EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = user_role_assignments.role_id
        AND r.organization_id = public.get_current_org_id()
    )
  )
  WITH CHECK (
    organization_id = public.get_current_org_id()
    AND public.has_permission('configuracoes:manage_roles')
    AND EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = user_role_assignments.role_id
        AND r.organization_id = public.get_current_org_id()
    )
  );

-- User permission overrides (cuidado com recursão)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_permission_overrides' AND policyname='Overrides por organização (ALL)') THEN
    DROP POLICY "Overrides por organização (ALL)" ON public.user_permission_overrides;
  END IF;
END $$;

-- SELECT: próprio usuário ou admin (sem usar has_permission para evitar recursão)
CREATE POLICY "user_permission_overrides: select self or admin"
  ON public.user_permission_overrides
  FOR SELECT
  USING (
    organization_id = public.get_current_org_id()
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.user_role_assignments ura
        JOIN public.roles r ON r.id = ura.role_id
        WHERE ura.user_id = auth.uid()
          AND ura.organization_id = public.get_current_org_id()
          AND r.slug = 'admin'
      )
    )
  );

-- MUTATE: somente com permissão explícita
CREATE POLICY "user_permission_overrides: mutate by permission"
  ON public.user_permission_overrides
  FOR ALL
  USING (
    organization_id = public.get_current_org_id()
    AND public.has_permission('permissions:override')
  )
  WITH CHECK (
    organization_id = public.get_current_org_id()
    AND public.has_permission('permissions:override')
  );

-- 3) Habilitar RLS na tabela interna com deny-all
ALTER TABLE public._backfill_report_org_nulls ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='_backfill_report_org_nulls'
  ) THEN
    CREATE POLICY "deny all _backfill_report_org_nulls" ON public._backfill_report_org_nulls FOR ALL USING (false) WITH CHECK (false);
  END IF;
END $$;

-- 4) Tabela para OAuth state (sem expor dados sensíveis no state)
CREATE TABLE IF NOT EXISTS public.oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_verifier text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes')
);
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;
-- opcional: permitir que o próprio usuário visualize (não necessário para o fluxo, que usa service role)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='oauth_states') THEN
    CREATE POLICY "oauth_states: self read" ON public.oauth_states FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON public.oauth_states(expires_at);

-- 5) Atualizar a função complete_onboarding para usar organization_id em configuracoes e remover tiny_token
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
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN '{"error": "Usuário não autenticado"}'::JSON;
  END IF;

  INSERT INTO public.organizacoes (nome, cnpj, plano)
  VALUES (org_nome, NULLIF(org_cnpj, ''), 'basico')
  RETURNING id INTO new_org_id;

  UPDATE public.profiles 
  SET nome_completo = user_nome,
      cargo = user_cargo,
      organizacao_id = new_org_id,
      updated_at = now()
  WHERE id = current_user_id;

  -- Limpar apenas configs desta organização
  DELETE FROM public.configuracoes 
  WHERE organization_id = new_org_id 
    AND chave IN ('alertas_email', 'onboarding_completo');

  -- Inserir configurações iniciais (sem armazenar tiny_token)
  INSERT INTO public.configuracoes (organization_id, chave, valor, tipo) VALUES
  (new_org_id, 'alertas_email', 'true', 'boolean'),
  (new_org_id, 'onboarding_completo', 'true', 'boolean');

  -- RBAC: criar cargo Administrador e conceder permissões
  PERFORM public.seed_admin_role_for_org(new_org_id, current_user_id);

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

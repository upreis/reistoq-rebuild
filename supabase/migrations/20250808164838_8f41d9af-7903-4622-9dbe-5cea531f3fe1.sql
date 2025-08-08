-- Convites de colaboradores: tabela + RLS + funções
-- 1) Tabela invitations
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  role_id uuid NOT NULL,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | accepted | revoked | expired
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz
);

-- Índices úteis
CREATE UNIQUE INDEX IF NOT EXISTS invitations_token_key ON public.invitations(token);
CREATE INDEX IF NOT EXISTS invitations_org_status_idx ON public.invitations(organization_id, status);
CREATE INDEX IF NOT EXISTS invitations_email_idx ON public.invitations((lower(email)));

-- RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Policies: restringe por organização atual
DROP POLICY IF EXISTS "Invites SELECT por organização" ON public.invitations;
CREATE POLICY "Invites SELECT por organização"
ON public.invitations
FOR SELECT
USING (organization_id = public.get_current_org_id());

DROP POLICY IF EXISTS "Invites INSERT por organização" ON public.invitations;
CREATE POLICY "Invites INSERT por organização"
ON public.invitations
FOR INSERT
WITH CHECK (organization_id = public.get_current_org_id());

DROP POLICY IF EXISTS "Invites UPDATE por organização" ON public.invitations;
CREATE POLICY "Invites UPDATE por organização"
ON public.invitations
FOR UPDATE
USING (organization_id = public.get_current_org_id())
WITH CHECK (organization_id = public.get_current_org_id());

DROP POLICY IF EXISTS "Invites DELETE por organização" ON public.invitations;
CREATE POLICY "Invites DELETE por organização"
ON public.invitations
FOR DELETE
USING (organization_id = public.get_current_org_id());

-- 2) Permissão do app para gerenciar convites (idempotente)
INSERT INTO public.app_permissions(key, name, description)
SELECT 'configuracoes:manage_invitations', 'Gerenciar convites', 'Criar e gerenciar convites de colaboradores'
WHERE NOT EXISTS (
  SELECT 1 FROM public.app_permissions WHERE key = 'configuracoes:manage_invitations'
);

-- 3) Função para criar convite
CREATE OR REPLACE FUNCTION public.create_invitation(_email text, _role_id uuid, _expires_in_days int DEFAULT 7)
RETURNS TABLE (id uuid, token uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
  v_role_org uuid;
BEGIN
  IF coalesce(trim(_email), '') = '' THEN
    RAISE EXCEPTION 'E-mail é obrigatório';
  END IF;

  -- Organização atual do usuário autenticado
  v_org_id := public.get_current_org_id();
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organização não encontrada para o usuário atual';
  END IF;

  -- Validar que o cargo pertence à organização
  SELECT organization_id INTO v_role_org FROM public.roles WHERE id = _role_id;
  IF v_role_org IS NULL OR v_role_org <> v_org_id THEN
    RAISE EXCEPTION 'Cargo inválido para a organização';
  END IF;

  RETURN QUERY
  INSERT INTO public.invitations (email, organization_id, role_id, invited_by, expires_at)
  VALUES (lower(_email), v_org_id, _role_id, auth.uid(), now() + make_interval(days => _expires_in_days))
  RETURNING id, token;
END;
$$;

-- 4) Função para aceitar convite
CREATE OR REPLACE FUNCTION public.accept_invite(_token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inv RECORD;
  current_uid uuid;
  current_email text;
  already_assigned boolean := false;
BEGIN
  current_uid := auth.uid();
  IF current_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  -- Buscar e validar convite
  SELECT * INTO inv
  FROM public.invitations
  WHERE token = _token
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Convite inválido, expirado ou já utilizado');
  END IF;

  -- Obter e-mail do usuário autenticado de auth.users
  SELECT email INTO current_email FROM auth.users WHERE id = current_uid;
  IF current_email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'E-mail do usuário não encontrado');
  END IF;

  IF lower(current_email) <> lower(inv.email) THEN
    RETURN json_build_object('success', false, 'error', 'E-mail do convite não corresponde ao seu e-mail');
  END IF;

  -- Garantir que o perfil aponte para a organização do convite
  UPDATE public.profiles
  SET organizacao_id = inv.organization_id, updated_at = now()
  WHERE id = current_uid AND (organizacao_id IS DISTINCT FROM inv.organization_id);

  -- Evitar duplicidade de assignment
  SELECT EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    WHERE ura.user_id = current_uid AND ura.role_id = inv.role_id AND ura.organization_id = inv.organization_id
  ) INTO already_assigned;

  IF NOT already_assigned THEN
    INSERT INTO public.user_role_assignments (user_id, role_id, organization_id)
    VALUES (current_uid, inv.role_id, inv.organization_id);
  END IF;

  -- Marcar convite como aceito
  UPDATE public.invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = inv.id;

  RETURN json_build_object('success', true, 'organization_id', inv.organization_id, 'role_id', inv.role_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 5) Função opcional para revogar convite
CREATE OR REPLACE FUNCTION public.revoke_invitation(_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  v_org_id := public.get_current_org_id();
  IF v_org_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Organização não encontrada');
  END IF;

  UPDATE public.invitations
  SET status = 'revoked'
  WHERE id = _id AND organization_id = v_org_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Convite não encontrado ou já processado');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;
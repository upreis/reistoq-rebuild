-- Criar enum para roles do sistema
CREATE TYPE public.app_role AS ENUM ('admin', 'gerente', 'operador', 'visualizador');

-- Criar tabela de roles de usuários
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função de segurança para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para verificar se usuário tem qualquer um dos roles especificados
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- Políticas RLS para user_roles
CREATE POLICY "Usuários podem ver seus próprios roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins podem gerenciar todos os roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Atualizar função de onboarding para atribuir role de admin ao primeiro usuário
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  org_nome TEXT, 
  org_cnpj TEXT, 
  user_nome TEXT, 
  user_cargo TEXT, 
  tiny_token TEXT
)
RETURNS JSON
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

  -- Atribuir role de admin ao usuário (primeiro usuário da organização)
  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (current_user_id, 'admin', current_user_id)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Limpar configurações existentes que podem estar conflitando
  DELETE FROM public.configuracoes WHERE chave IN ('tiny_token', 'alertas_email', 'onboarding_completo');

  -- Inserir configurações apenas se fornecidas
  INSERT INTO public.configuracoes (chave, valor) VALUES
  ('tiny_token', COALESCE(NULLIF(tiny_token, ''), '')),
  ('alertas_email', 'true'),
  ('onboarding_completo', 'true');

  -- Retornar sucesso
  result := json_build_object(
    'success', true,
    'organizacao_id', new_org_id,
    'user_id', current_user_id,
    'role', 'admin'
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

-- Atualizar políticas das tabelas principais para considerar roles
-- Produtos: Admin e Gerente podem tudo, Operador pode ver e atualizar, Visualizador só pode ver
DROP POLICY IF EXISTS "Produtos por organização" ON public.produtos;

CREATE POLICY "Admins e gerentes têm acesso total aos produtos"
ON public.produtos
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.organizacao_id IS NOT NULL
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'gerente'])
  )
);

CREATE POLICY "Operadores podem ver e atualizar produtos"
ON public.produtos
FOR SELECT, UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.organizacao_id IS NOT NULL
    AND public.has_role(auth.uid(), 'operador')
  )
);

CREATE POLICY "Visualizadores podem apenas ver produtos"
ON public.produtos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.organizacao_id IS NOT NULL
    AND public.has_role(auth.uid(), 'visualizador')
  )
);

-- Aplicar políticas similares para outras tabelas críticas
-- Pedidos
DROP POLICY IF EXISTS "Pedidos por organização" ON public.pedidos;

CREATE POLICY "Acesso aos pedidos baseado em role"
ON public.pedidos
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.organizacao_id IS NOT NULL
    AND (
      public.has_any_role(auth.uid(), ARRAY['admin', 'gerente']) OR
      (public.has_role(auth.uid(), 'operador') AND TG_OP IN ('SELECT', 'UPDATE')) OR
      (public.has_role(auth.uid(), 'visualizador') AND TG_OP = 'SELECT')
    )
  )
);

-- Configurações: apenas admins podem modificar
DROP POLICY IF EXISTS "Usuários podem atualizar configurações da sua organização" ON public.configuracoes;
DROP POLICY IF EXISTS "Usuários podem inserir configurações para sua organização" ON public.configuracoes;
DROP POLICY IF EXISTS "Usuários podem deletar configurações da sua organização" ON public.configuracoes;

CREATE POLICY "Apenas admins podem modificar configurações"
ON public.configuracoes
FOR INSERT, UPDATE, DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.organizacao_id IS NOT NULL
    AND public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Usuários podem ver configurações da organização"
ON public.configuracoes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.organizacao_id IS NOT NULL
  )
);
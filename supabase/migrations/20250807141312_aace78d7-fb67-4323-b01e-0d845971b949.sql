-- Corrigir a função com parâmetros corretos

-- Desabilitar RLS para todas as tabelas relevantes
ALTER TABLE public.organizacoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Remover constraint UNIQUE no CNPJ se existir
ALTER TABLE public.organizacoes DROP CONSTRAINT IF EXISTS organizacoes_cnpj_key;

-- Criar função corrigida para o onboarding
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
AS $$
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
$$;
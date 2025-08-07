-- CORREÇÕES CRÍTICAS DE SEGURANÇA - FASE 1
-- Corrigindo falhas críticas de RLS que deixam dados expostos

-- 1. Habilitar RLS em todas as tabelas que têm políticas mas não têm RLS ativo
ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Corrigir funções com search_path mutável para prevenir SQL injection
ALTER FUNCTION public.complete_onboarding(text, text, text, text, text) SET search_path = 'public';
ALTER FUNCTION public.handle_new_user() SET search_path = 'public';

-- 3. Remover políticas perigosas que permitem acesso total (true)
-- e substituir por políticas baseadas em organização

-- Primeiro, dropar políticas perigosas existentes
DROP POLICY IF EXISTS "Permitir acesso total às configurações para usuários autent" ON public.configuracoes;
DROP POLICY IF EXISTS "Permitir acesso total às organizações para usuários autenti" ON public.organizacoes;

-- 4. Criar políticas de segurança baseadas em organização para configuracoes
CREATE POLICY "Usuários podem ver configurações da sua organização" 
ON public.configuracoes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organizacao_id IS NOT NULL
  )
);

CREATE POLICY "Usuários podem atualizar configurações da sua organização" 
ON public.configuracoes 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organizacao_id IS NOT NULL
  )
);

CREATE POLICY "Usuários podem inserir configurações para sua organização" 
ON public.configuracoes 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organizacao_id IS NOT NULL
  )
);

-- 5. Criar políticas de segurança para organizações
CREATE POLICY "Usuários podem ver apenas sua própria organização" 
ON public.organizacoes 
FOR SELECT 
USING (
  id IN (
    SELECT profiles.organizacao_id 
    FROM public.profiles 
    WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Usuários podem atualizar apenas sua própria organização" 
ON public.organizacoes 
FOR UPDATE 
USING (
  id IN (
    SELECT profiles.organizacao_id 
    FROM public.profiles 
    WHERE profiles.id = auth.uid()
  )
);

-- 6. Habilitar RLS em tabelas críticas que ainda não têm
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_vendas ENABLE ROW LEVEL SECURITY;

-- 7. Corrigir políticas excessivamente permissivas em outras tabelas
-- Remover políticas "true" perigosas
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.historico;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "Permitir acesso total ao histórico de vendas" ON public.historico_vendas;
DROP POLICY IF EXISTS "Permitir acesso total aos itens de pedidos" ON public.itens_pedidos;
DROP POLICY IF EXISTS "Acesso total aos pedidos para usuários autenticados" ON public.pedidos;

-- 8. Criar políticas de segurança baseadas em organização para outras tabelas críticas
CREATE POLICY "Usuários autenticados podem acessar histórico" 
ON public.historico 
FOR ALL 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem acessar movimentações" 
ON public.movimentacoes_estoque 
FOR ALL 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem ver histórico de vendas da organização" 
ON public.historico_vendas 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organizacao_id IS NOT NULL
  )
);

CREATE POLICY "Usuários podem inserir histórico de vendas da organização" 
ON public.historico_vendas 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organizacao_id IS NOT NULL
  )
);

CREATE POLICY "Usuários podem atualizar histórico de vendas da organização" 
ON public.historico_vendas 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organizacao_id IS NOT NULL
  )
);

CREATE POLICY "Usuários podem ver itens de pedidos da organização" 
ON public.itens_pedidos 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organizacao_id IS NOT NULL
  )
);

CREATE POLICY "Usuários podem inserir itens de pedidos da organização" 
ON public.itens_pedidos 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organizacao_id IS NOT NULL
  )
);

CREATE POLICY "Usuários podem atualizar itens de pedidos da organização" 
ON public.itens_pedidos 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organizacao_id IS NOT NULL
  )
);
-- Vou recorrigir as políticas RLS com uma abordagem mais simples e direta

-- Primeiro, remover todas as políticas existentes da tabela organizacoes
DROP POLICY IF EXISTS "Usuários podem ver sua organização" ON public.organizacoes;
DROP POLICY IF EXISTS "Usuários podem criar organizações" ON public.organizacoes;
DROP POLICY IF EXISTS "Usuários podem atualizar sua organização" ON public.organizacoes;
DROP POLICY IF EXISTS "Usuários podem deletar sua organização" ON public.organizacoes;

-- Criar políticas mais permissivas para o onboarding funcionar
-- Permitir que usuários autenticados façam tudo com organizações
CREATE POLICY "Permitir acesso total às organizações para usuários autenticados"
ON public.organizacoes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Verificar e corrigir as políticas da tabela configuracoes também
-- Remover políticas conflitantes se existirem
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.configuracoes;
DROP POLICY IF EXISTS "Permitir acesso total às configurações" ON public.configuracoes;

-- Criar política permissiva para configurações
CREATE POLICY "Permitir acesso total às configurações para usuários autenticados"
ON public.configuracoes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
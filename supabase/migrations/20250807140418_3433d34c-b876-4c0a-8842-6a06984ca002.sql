-- Corrigir políticas RLS para tabela organizacoes
-- O erro é que usuários não podem inserir organizações devido à falta de política de INSERT

-- Permitir que usuários autenticados criem organizações
CREATE POLICY "Usuários podem criar organizações" 
ON public.organizacoes 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Permitir que usuários atualizem organizações onde são membros
CREATE POLICY "Usuários podem atualizar sua organização" 
ON public.organizacoes 
FOR UPDATE 
TO authenticated
USING (id IN (SELECT profiles.organizacao_id FROM profiles WHERE profiles.id = auth.uid()))
WITH CHECK (id IN (SELECT profiles.organizacao_id FROM profiles WHERE profiles.id = auth.uid()));

-- Permitir que usuários deletem organizações onde são membros (admin)
CREATE POLICY "Usuários podem deletar sua organização" 
ON public.organizacoes 
FOR DELETE 
TO authenticated
USING (id IN (SELECT profiles.organizacao_id FROM profiles WHERE profiles.id = auth.uid()));
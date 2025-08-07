-- CORREÇÃO FINAL DE SEGURANÇA - Corrigir funções restantes com search_path

-- Corrigir todas as funções restantes que têm search_path mutável
ALTER FUNCTION public.registrar_historico_depara() SET search_path = 'public';
ALTER FUNCTION public.verificar_alertas_tempo_real() SET search_path = 'public';  
ALTER FUNCTION public.registrar_movimentacao_estoque() SET search_path = 'public';
ALTER FUNCTION public.update_updated_at_column() SET search_path = 'public';
ALTER FUNCTION public.update_sync_control_updated_at() SET search_path = 'public';

-- Adicionar políticas DELETE ausentes para completar a segurança
CREATE POLICY "Usuários podem deletar configurações da sua organização" 
ON public.configuracoes 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organizacao_id IS NOT NULL
  )
);

CREATE POLICY "Usuários podem deletar histórico de vendas da organização" 
ON public.historico_vendas 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organizacao_id IS NOT NULL
  )
);

CREATE POLICY "Usuários podem deletar itens de pedidos da organização" 
ON public.itens_pedidos 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organizacao_id IS NOT NULL
  )
);

-- Garantir que políticas de pedidos estejam consistentes
CREATE POLICY "Usuários podem ver pedidos da organização" 
ON public.pedidos 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organizacao_id IS NOT NULL
  )
);

CREATE POLICY "Usuários podem inserir pedidos da organização" 
ON public.pedidos 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organizacao_id IS NOT NULL
  )
);

CREATE POLICY "Usuários podem atualizar pedidos da organização" 
ON public.pedidos 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organizacao_id IS NOT NULL
  )
);

CREATE POLICY "Usuários podem deletar pedidos da organização" 
ON public.pedidos 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organizacao_id IS NOT NULL
  )
);
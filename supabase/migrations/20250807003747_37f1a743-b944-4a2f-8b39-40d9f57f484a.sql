-- Adicionar coluna total_itens à tabela historico_vendas
ALTER TABLE public.historico_vendas 
ADD COLUMN total_itens integer DEFAULT 0;
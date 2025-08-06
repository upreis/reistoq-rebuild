-- Adicionar colunas que faltam na tabela historico_vendas
ALTER TABLE public.historico_vendas 
ADD COLUMN IF NOT EXISTS numero_venda text,
ADD COLUMN IF NOT EXISTS sku_estoque text,
ADD COLUMN IF NOT EXISTS sku_kit text,
ADD COLUMN IF NOT EXISTS qtd_kit integer DEFAULT 0;
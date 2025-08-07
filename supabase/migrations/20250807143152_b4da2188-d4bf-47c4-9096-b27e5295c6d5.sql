-- Fase 1: Adaptação para múltiplas contas Tiny ERP
-- Adicionar colunas de empresa e numero_venda

-- 1. Adicionar coluna empresa na tabela pedidos
ALTER TABLE public.pedidos 
ADD COLUMN empresa TEXT;

-- 2. Adicionar coluna numero_venda na tabela pedidos  
ALTER TABLE public.pedidos 
ADD COLUMN numero_venda TEXT;

-- 3. Adicionar coluna empresa na tabela itens_pedidos
ALTER TABLE public.itens_pedidos 
ADD COLUMN empresa TEXT;

-- 4. Adicionar coluna empresa na tabela historico_vendas
ALTER TABLE public.historico_vendas 
ADD COLUMN empresa TEXT;
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

-- 5. Criar índice único para SKU pedido + numero da venda nos itens_pedidos
-- (removendo o índice antigo se existir e criando o novo)
DROP INDEX IF EXISTS idx_itens_pedidos_unique_old;
CREATE UNIQUE INDEX idx_itens_pedidos_sku_numero_venda 
ON public.itens_pedidos (sku, numero_venda) 
WHERE numero_venda IS NOT NULL;

-- 6. Criar índice único para historico_vendas com empresa
CREATE UNIQUE INDEX idx_historico_vendas_sku_numero_venda_empresa 
ON public.historico_vendas (sku_produto, numero_venda, empresa) 
WHERE numero_venda IS NOT NULL AND empresa IS NOT NULL;

-- 7. Adicionar índices para melhorar performance de consultas por empresa
CREATE INDEX idx_pedidos_empresa ON public.pedidos (empresa) WHERE empresa IS NOT NULL;
CREATE INDEX idx_itens_pedidos_empresa ON public.itens_pedidos (empresa) WHERE empresa IS NOT NULL;
CREATE INDEX idx_historico_vendas_empresa ON public.historico_vendas (empresa) WHERE empresa IS NOT NULL;
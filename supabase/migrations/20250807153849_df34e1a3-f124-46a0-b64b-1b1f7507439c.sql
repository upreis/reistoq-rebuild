-- Adicionar coluna 'empresa' nas tabelas de pedidos
ALTER TABLE public.pedidos 
ADD COLUMN empresa text;

-- Adicionar coluna 'empresa' na tabela itens_pedidos 
ALTER TABLE public.itens_pedidos 
ADD COLUMN empresa text;

-- Adicionar coluna 'empresa' na tabela historico_vendas
-- (parece que já existe baseado no schema, mas vamos garantir)
-- ALTER TABLE public.historico_vendas ADD COLUMN empresa text; -- já existe

-- Criar índices para melhorar performance das consultas
CREATE INDEX idx_pedidos_empresa ON public.pedidos(empresa);
CREATE INDEX idx_itens_pedidos_empresa ON public.itens_pedidos(empresa);
CREATE INDEX idx_historico_vendas_empresa ON public.historico_vendas(empresa);

-- Criar índices compostos para o novo ID único (SKU + numero_venda)
CREATE INDEX idx_itens_pedidos_sku_numero_venda ON public.itens_pedidos(sku, numero_venda);
CREATE INDEX idx_historico_vendas_sku_numero_venda ON public.historico_vendas(sku_produto, numero_venda);

-- Adicionar comentários para documentar as mudanças
COMMENT ON COLUMN public.pedidos.empresa IS 'Nome da empresa responsável pelo pedido';
COMMENT ON COLUMN public.itens_pedidos.empresa IS 'Nome da empresa responsável pelo item do pedido';
COMMENT ON INDEX idx_pedidos_empresa IS 'Índice para consultas por empresa';
COMMENT ON INDEX idx_itens_pedidos_empresa IS 'Índice para consultas de itens por empresa';
COMMENT ON INDEX idx_itens_pedidos_sku_numero_venda IS 'Índice composto para ID único SKU + numero_venda';
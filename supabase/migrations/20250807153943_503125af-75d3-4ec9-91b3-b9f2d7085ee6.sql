-- Criar apenas os índices que não existem
-- Verificar se existe antes de criar
DO $$
BEGIN
  -- Índices para empresa
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pedidos_empresa') THEN
    CREATE INDEX idx_pedidos_empresa ON public.pedidos(empresa);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_itens_pedidos_empresa') THEN
    CREATE INDEX idx_itens_pedidos_empresa ON public.itens_pedidos(empresa);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_historico_vendas_empresa') THEN
    CREATE INDEX idx_historico_vendas_empresa ON public.historico_vendas(empresa);
  END IF;
  
  -- Índices compostos para o novo ID único (SKU + numero_venda)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_itens_pedidos_sku_numero_venda') THEN
    CREATE INDEX idx_itens_pedidos_sku_numero_venda ON public.itens_pedidos(sku, numero_venda);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_historico_vendas_sku_numero_venda') THEN
    CREATE INDEX idx_historico_vendas_sku_numero_venda ON public.historico_vendas(sku_produto, numero_venda);
  END IF;
END
$$;
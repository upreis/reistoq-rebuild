-- Índices para desempenho de filtros Tiny (pedidos)
CREATE INDEX IF NOT EXISTS idx_pedidos_data_pedido ON public.pedidos (data_pedido);
CREATE INDEX IF NOT EXISTS idx_pedidos_situacao ON public.pedidos (situacao);
CREATE INDEX IF NOT EXISTS idx_pedidos_numero ON public.pedidos (numero);
CREATE INDEX IF NOT EXISTS idx_pedidos_numero_ecommerce ON public.pedidos (numero_ecommerce);
CREATE INDEX IF NOT EXISTS idx_pedidos_integration_account_id ON public.pedidos (integration_account_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON public.pedidos (created_at);
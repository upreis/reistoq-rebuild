-- Criar índices únicos e adicionar RLS nas novas estruturas

-- 1. Criar índice único para SKU pedido + numero da venda nos itens_pedidos
CREATE UNIQUE INDEX idx_itens_pedidos_sku_numero_venda 
ON public.itens_pedidos (sku, numero_venda) 
WHERE numero_venda IS NOT NULL;

-- 2. Criar índice único para historico_vendas com empresa
CREATE UNIQUE INDEX idx_historico_vendas_sku_numero_venda_empresa 
ON public.historico_vendas (sku_produto, numero_venda, empresa) 
WHERE numero_venda IS NOT NULL AND empresa IS NOT NULL;

-- 3. Adicionar índices para melhorar performance de consultas por empresa
CREATE INDEX idx_pedidos_empresa ON public.pedidos (empresa) WHERE empresa IS NOT NULL;
CREATE INDEX idx_itens_pedidos_empresa ON public.itens_pedidos (empresa) WHERE empresa IS NOT NULL;  
CREATE INDEX idx_historico_vendas_empresa ON public.historico_vendas (empresa) WHERE empresa IS NOT NULL;

-- 4. Habilitar RLS nas tabelas que ainda não têm
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_vendas ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas RLS básicas para as novas tabelas
CREATE POLICY "Acesso total aos pedidos para usuários autenticados" 
ON public.pedidos 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Acesso total aos itens de pedidos para usuários autenticados" 
ON public.itens_pedidos 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Acesso total ao histórico de vendas para usuários autenticados" 
ON public.historico_vendas 
FOR ALL 
USING (true) 
WITH CHECK (true);
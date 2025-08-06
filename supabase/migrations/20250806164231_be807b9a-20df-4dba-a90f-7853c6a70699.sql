-- Adicionar colunas faltantes na tabela historico_vendas baseado nas tabelas pedidos e itens_pedidos

-- Colunas do item
ALTER TABLE public.historico_vendas 
ADD COLUMN IF NOT EXISTS ncm text,
ADD COLUMN IF NOT EXISTS codigo_barras text,
ADD COLUMN IF NOT EXISTS pedido_id text;

-- Colunas do pedido principal
ALTER TABLE public.historico_vendas 
ADD COLUMN IF NOT EXISTS cpf_cnpj text,
ADD COLUMN IF NOT EXISTS valor_frete numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS data_prevista date,
ADD COLUMN IF NOT EXISTS obs text,
ADD COLUMN IF NOT EXISTS obs_interna text,
ADD COLUMN IF NOT EXISTS cidade text,
ADD COLUMN IF NOT EXISTS uf text,
ADD COLUMN IF NOT EXISTS url_rastreamento text,
ADD COLUMN IF NOT EXISTS situacao text,
ADD COLUMN IF NOT EXISTS codigo_rastreamento text,
ADD COLUMN IF NOT EXISTS numero_ecommerce text,
ADD COLUMN IF NOT EXISTS valor_desconto numeric DEFAULT 0;

-- Renomear algumas colunas para maior consistência
ALTER TABLE public.historico_vendas RENAME COLUMN nome_produto TO descricao;
ALTER TABLE public.historico_vendas RENAME COLUMN data_venda TO data_pedido;
ALTER TABLE public.historico_vendas RENAME COLUMN quantidade_vendida TO quantidade;

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_historico_vendas_pedido_id ON public.historico_vendas(pedido_id);
CREATE INDEX IF NOT EXISTS idx_historico_vendas_situacao ON public.historico_vendas(situacao);
CREATE INDEX IF NOT EXISTS idx_historico_vendas_cidade ON public.historico_vendas(cidade);
CREATE INDEX IF NOT EXISTS idx_historico_vendas_uf ON public.historico_vendas(uf);
-- Remove a foreign key constraint existente problemática
ALTER TABLE public.itens_pedidos 
DROP CONSTRAINT IF EXISTS itens_pedidos_pedido_id_fkey;

-- Alterar a coluna pedido_id para corresponder ao tipo da tabela pedidos
ALTER TABLE public.itens_pedidos 
ALTER COLUMN pedido_id TYPE text;

-- Criar um índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_itens_pedidos_pedido_id 
ON public.itens_pedidos(pedido_id);

-- Criar um índice para numero_pedido também
CREATE INDEX IF NOT EXISTS idx_itens_pedidos_numero_pedido 
ON public.itens_pedidos(numero_pedido);
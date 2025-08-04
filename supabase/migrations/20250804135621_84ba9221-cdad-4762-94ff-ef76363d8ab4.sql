-- Corrigir tipo da coluna ID para aceitar os IDs reais do Tiny ERP
ALTER TABLE pedidos ALTER COLUMN id TYPE TEXT;

-- Também corrigir a tabela itens_pedidos para consistência
ALTER TABLE itens_pedidos ALTER COLUMN pedido_id TYPE TEXT;
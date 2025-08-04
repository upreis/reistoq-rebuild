-- Primeiro remover a foreign key constraint
ALTER TABLE itens_pedidos DROP CONSTRAINT IF EXISTS itens_pedidos_pedido_id_fkey;

-- Agora alterar os tipos das colunas
ALTER TABLE pedidos ALTER COLUMN id TYPE TEXT;
ALTER TABLE itens_pedidos ALTER COLUMN pedido_id TYPE TEXT;

-- Recriar a foreign key constraint com os novos tipos
ALTER TABLE itens_pedidos 
ADD CONSTRAINT itens_pedidos_pedido_id_fkey 
FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE;
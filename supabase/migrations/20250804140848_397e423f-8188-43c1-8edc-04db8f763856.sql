-- Limpar dados existentes para forçar nova sincronização com busca de itens
DELETE FROM itens_pedidos;
DELETE FROM pedidos WHERE data_pedido = '2025-07-08';

-- Verificar se as tabelas estão limpas
SELECT 'pedidos' as tabela, COUNT(*) as total FROM pedidos WHERE data_pedido = '2025-07-08'
UNION ALL
SELECT 'itens_pedidos' as tabela, COUNT(*) as total FROM itens_pedidos;
-- Limpar dados existentes para forçar nova sincronização
DELETE FROM itens_pedidos;
DELETE FROM pedidos;

-- Verificar se as tabelas estão vazias
SELECT 'pedidos' as tabela, COUNT(*) as total FROM pedidos
UNION ALL
SELECT 'itens_pedidos' as tabela, COUNT(*) as total FROM itens_pedidos;
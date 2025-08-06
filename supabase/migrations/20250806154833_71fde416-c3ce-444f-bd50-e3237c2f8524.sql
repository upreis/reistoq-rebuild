-- Remover colunas canal_venda e nome_ecommerce da tabela pedidos
ALTER TABLE public.pedidos 
DROP COLUMN canal_venda,
DROP COLUMN nome_ecommerce;
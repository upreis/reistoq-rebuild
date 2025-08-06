-- Adicionar colunas cidade e uf na tabela pedidos
ALTER TABLE public.pedidos 
ADD COLUMN cidade text,
ADD COLUMN uf text;
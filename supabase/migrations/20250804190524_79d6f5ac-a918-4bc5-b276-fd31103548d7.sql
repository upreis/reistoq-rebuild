-- Permitir que sku_correspondente seja NULL na tabela mapeamentos_depara
ALTER TABLE public.mapeamentos_depara 
ALTER COLUMN sku_correspondente DROP NOT NULL;
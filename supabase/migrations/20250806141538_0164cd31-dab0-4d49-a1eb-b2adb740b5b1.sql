-- Add missing column canal_venda to pedidos table
ALTER TABLE public.pedidos 
ADD COLUMN IF NOT EXISTS canal_venda TEXT;

-- Add missing column nome_ecommerce to pedidos table  
ALTER TABLE public.pedidos 
ADD COLUMN IF NOT EXISTS nome_ecommerce TEXT;

-- Create index for better performance on canal_venda searches
CREATE INDEX IF NOT EXISTS idx_pedidos_canal_venda 
ON public.pedidos(canal_venda);

-- Update existing rows with default values based on existing data
UPDATE public.pedidos 
SET canal_venda = CASE 
  WHEN numero_ecommerce IS NOT NULL AND numero_ecommerce != '' THEN 'E-commerce'
  ELSE 'Venda Direta'
END
WHERE canal_venda IS NULL;

UPDATE public.pedidos 
SET nome_ecommerce = CASE 
  WHEN numero_ecommerce IS NOT NULL AND numero_ecommerce != '' THEN 'E-commerce'
  ELSE 'Venda Direta'  
END
WHERE nome_ecommerce IS NULL;
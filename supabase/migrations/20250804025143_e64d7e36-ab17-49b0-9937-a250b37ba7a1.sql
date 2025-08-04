-- Criar tabela para itens de pedidos
CREATE TABLE public.itens_pedidos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  numero_pedido TEXT NOT NULL,
  sku TEXT NOT NULL,
  descricao TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 0,
  valor_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  ncm TEXT,
  codigo_barras TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Índices para performance
  UNIQUE(numero_pedido, sku)
);

-- Habilitar RLS
ALTER TABLE public.itens_pedidos ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso total aos itens de pedidos
CREATE POLICY "Permitir acesso total aos itens de pedidos" 
ON public.itens_pedidos 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Índices para otimizar consultas
CREATE INDEX idx_itens_pedidos_pedido_id ON public.itens_pedidos(pedido_id);
CREATE INDEX idx_itens_pedidos_numero_pedido ON public.itens_pedidos(numero_pedido);
CREATE INDEX idx_itens_pedidos_sku ON public.itens_pedidos(sku);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_itens_pedidos_updated_at
BEFORE UPDATE ON public.itens_pedidos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar constraint única para evitar duplicação
ALTER TABLE public.pedidos ADD CONSTRAINT unique_numero_pedido UNIQUE(numero);
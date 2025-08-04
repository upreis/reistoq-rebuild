-- Criar tabela para histórico de vendas
CREATE TABLE public.historico_vendas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id_unico TEXT NOT NULL UNIQUE,
  numero_pedido TEXT NOT NULL,
  sku_produto TEXT NOT NULL,
  nome_produto TEXT,
  quantidade_vendida INTEGER NOT NULL DEFAULT 0,
  valor_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  cliente_nome TEXT,
  cliente_documento TEXT,
  status TEXT NOT NULL DEFAULT 'concluida',
  observacoes TEXT,
  data_venda DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.historico_vendas ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Permitir acesso total ao histórico de vendas" 
ON public.historico_vendas 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Criar índices para performance
CREATE INDEX idx_historico_vendas_numero_pedido ON public.historico_vendas(numero_pedido);
CREATE INDEX idx_historico_vendas_sku_produto ON public.historico_vendas(sku_produto);
CREATE INDEX idx_historico_vendas_data_venda ON public.historico_vendas(data_venda);
CREATE INDEX idx_historico_vendas_status ON public.historico_vendas(status);
CREATE INDEX idx_historico_vendas_cliente_nome ON public.historico_vendas(cliente_nome);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_historico_vendas_updated_at
  BEFORE UPDATE ON public.historico_vendas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
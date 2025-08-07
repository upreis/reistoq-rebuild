-- CRÍTICO: Implementar multi-tenancy
-- 1. Criar tabela de organizações
CREATE TABLE public.organizacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  plano TEXT NOT NULL DEFAULT 'basico',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Adicionar organização aos profiles
ALTER TABLE public.profiles 
ADD COLUMN organizacao_id UUID REFERENCES public.organizacoes(id);

-- 3. RLS para organizações
ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver sua organização" 
ON public.organizacoes 
FOR SELECT 
USING (
  id IN (
    SELECT organizacao_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- 4. Atualizar RLS dos produtos para multi-tenancy
DROP POLICY IF EXISTS "Permitir acesso total aos produtos" ON public.produtos;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.produtos;

CREATE POLICY "Produtos por organização" 
ON public.produtos 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND organizacao_id IS NOT NULL
  )
);

-- 5. Atualizar RLS das demais tabelas
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.pedidos;
CREATE POLICY "Pedidos por organização" 
ON public.pedidos 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND organizacao_id IS NOT NULL
  )
);

-- 6. Trigger para updated_at
CREATE TRIGGER update_organizacoes_updated_at
BEFORE UPDATE ON public.organizacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
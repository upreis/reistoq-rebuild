-- Adicionar campos para melhorar o sistema DePara
ALTER TABLE public.mapeamentos_depara 
ADD COLUMN prioridade text DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
ADD COLUMN pedidos_aguardando integer DEFAULT 0,
ADD COLUMN tempo_criacao_pedido timestamp with time zone,
ADD COLUMN usuario_mapeamento text,
ADD COLUMN data_mapeamento timestamp with time zone,
ADD COLUMN motivo_criacao text DEFAULT 'manual';

-- Criar tabela de histórico de mapeamentos DePara
CREATE TABLE public.historico_depara (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mapeamento_id uuid NOT NULL,
  acao text NOT NULL CHECK (acao IN ('criacao', 'edicao', 'exclusao', 'ativacao', 'desativacao')),
  valores_anteriores jsonb,
  valores_novos jsonb,
  usuario_id uuid,
  motivo text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela de histórico
ALTER TABLE public.historico_depara ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso total ao histórico
CREATE POLICY "Permitir acesso total ao histórico DePara" 
ON public.historico_depara 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Criar índices para melhor performance
CREATE INDEX idx_historico_depara_mapeamento_id ON public.historico_depara(mapeamento_id);
CREATE INDEX idx_historico_depara_acao ON public.historico_depara(acao);
CREATE INDEX idx_historico_depara_created_at ON public.historico_depara(created_at);
CREATE INDEX idx_mapeamentos_depara_prioridade ON public.mapeamentos_depara(prioridade);
CREATE INDEX idx_mapeamentos_depara_pedidos_aguardando ON public.mapeamentos_depara(pedidos_aguardando);

-- Função para registrar histórico automaticamente
CREATE OR REPLACE FUNCTION public.registrar_historico_depara()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.historico_depara (
      mapeamento_id,
      acao,
      valores_novos,
      usuario_id
    ) VALUES (
      NEW.id,
      'criacao',
      to_jsonb(NEW),
      auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.historico_depara (
      mapeamento_id,
      acao,
      valores_anteriores,
      valores_novos,
      usuario_id
    ) VALUES (
      NEW.id,
      'edicao',
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.historico_depara (
      mapeamento_id,
      acao,
      valores_anteriores,
      usuario_id
    ) VALUES (
      OLD.id,
      'exclusao',
      to_jsonb(OLD),
      auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- Criar trigger para registrar histórico
DROP TRIGGER IF EXISTS trigger_historico_depara ON public.mapeamentos_depara;
CREATE TRIGGER trigger_historico_depara
  AFTER INSERT OR UPDATE OR DELETE ON public.mapeamentos_depara
  FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_depara();
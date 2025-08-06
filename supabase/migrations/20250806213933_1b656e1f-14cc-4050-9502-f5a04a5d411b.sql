-- Adicionar configuração para sincronização automática de estoque
INSERT INTO configuracoes (chave, valor, tipo, descricao) 
VALUES (
  'sync_estoque_automatico', 
  'false', 
  'boolean', 
  'Sincronização automática de estoque com Tiny ERP'
) ON CONFLICT (chave) DO NOTHING;

-- Melhorar a função de registro de movimentação para incluir sincronização
CREATE OR REPLACE FUNCTION public.registrar_movimentacao_estoque()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sync_automatico boolean := false;
BEGIN
  -- Só registra se a quantidade mudou
  IF OLD.quantidade_atual != NEW.quantidade_atual THEN
    INSERT INTO public.movimentacoes_estoque (
      produto_id,
      tipo_movimentacao,
      quantidade_anterior,
      quantidade_nova,
      quantidade_movimentada,
      motivo
    ) VALUES (
      NEW.id,
      CASE 
        WHEN NEW.quantidade_atual > OLD.quantidade_atual THEN 'entrada'
        ELSE 'saida'
      END,
      OLD.quantidade_atual,
      NEW.quantidade_atual,
      ABS(NEW.quantidade_atual - OLD.quantidade_atual),
      'Movimentação automática'
    );
    
    -- Atualizar ultima_movimentacao
    NEW.ultima_movimentacao = now();
    
    -- Verificar se sincronização automática está ativada
    SELECT (valor = 'true') INTO sync_automatico
    FROM configuracoes 
    WHERE chave = 'sync_estoque_automatico';
    
    -- Se sincronização automática estiver ativada, chamar edge function
    IF sync_automatico THEN
      PERFORM net.http_post(
        url := 'https://tdjyfqnxvjgossuncpwm.supabase.co/functions/v1/sincronizar-estoque-tiny',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkanlmcW54dmpnb3NzdW5jcHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTczNTMsImV4cCI6MjA2OTQ3MzM1M30.qrEBpARgfuWF74zHoRzGJyWjgxN_oCG5DdKjPVGJYxk"}'::jsonb,
        body := jsonb_build_object(
          'produto_id', NEW.id,
          'quantidade', NEW.quantidade_atual,
          'tipo_movimentacao', CASE 
            WHEN NEW.quantidade_atual > OLD.quantidade_atual THEN 'E'
            ELSE 'B'
          END,
          'observacoes', 'Sincronização automática via REISTOQ'
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
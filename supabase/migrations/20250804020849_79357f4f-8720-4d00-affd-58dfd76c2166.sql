-- Criar função para verificar e enviar alertas em tempo real
CREATE OR REPLACE FUNCTION public.verificar_alertas_tempo_real()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  alertas_ativados boolean := false;
  intervalo_minutos integer := 60;
BEGIN
  -- Verificar se alertas automáticos estão ativados e se é tempo real (intervalo = 0)
  SELECT (valor = 'true') INTO alertas_ativados
  FROM configuracoes 
  WHERE chave = 'alertas_automaticos';
  
  SELECT valor::integer INTO intervalo_minutos
  FROM configuracoes 
  WHERE chave = 'intervalo_alertas';
  
  -- Se alertas estão ativados e é tempo real (intervalo = 0)
  -- E se o produto passou a ter estoque baixo
  IF alertas_ativados AND intervalo_minutos = 0 THEN
    IF (NEW.quantidade_atual = 0 OR NEW.quantidade_atual <= NEW.estoque_minimo) 
       AND (OLD.quantidade_atual > NEW.estoque_minimo OR OLD.quantidade_atual > 0) THEN
      
      -- Chamar função de alertas de forma assíncrona usando pg_net
      PERFORM net.http_post(
        url := 'https://tdjyfqnxvjgossuncpwm.supabase.co/functions/v1/alertas-estoque',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkanlmcW54dmpnb3NzdW5jcHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTczNTMsImV4cCI6MjA2OTQ3MzM1M30.qrEBpARgfuWF74zHoRzGJyWjgxN_oCG5DdKjPVGJYxk"}'::jsonb,
        body := '{"trigger": "real_time", "produto_id": "' || NEW.id || '"}'::jsonb
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar o trigger para alertas em tempo real
DROP TRIGGER IF EXISTS trigger_alertas_tempo_real ON public.produtos;
CREATE TRIGGER trigger_alertas_tempo_real
  AFTER UPDATE ON public.produtos
  FOR EACH ROW
  EXECUTE FUNCTION public.verificar_alertas_tempo_real();
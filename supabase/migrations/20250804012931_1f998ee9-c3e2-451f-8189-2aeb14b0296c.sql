-- Criar função que chama o edge function de alertas quando estoque fica baixo
CREATE OR REPLACE FUNCTION public.verificar_alertas_estoque()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  response_result jsonb;
BEGIN
  -- Só executar se a quantidade mudou e ficou baixa ou zerou
  IF (NEW.quantidade_atual != OLD.quantidade_atual) AND 
     (NEW.quantidade_atual <= NEW.estoque_minimo OR NEW.quantidade_atual = 0) THEN
    
    -- Fazer chamada HTTP para a edge function de alertas
    -- Usando a extensão http para fazer a requisição
    SELECT content::jsonb INTO response_result
    FROM http_post(
      'https://tdjyfqnxvjgossuncpwm.supabase.co/functions/v1/alertas-estoque',
      '{}',
      'application/json',
      ARRAY[
        http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkanlmcW54dmpnb3NzdW5jcHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTczNTMsImV4cCI6MjA2OTQ3MzM1M30.qrEBpARgfuWF74zHoRzGJyWjgxN_oCG5DdKjPVGJYxk'),
        http_header('apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkanlmcW54dmpnb3NzdW5jcHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTczNTMsImV4cCI6MjA2OTQ3MzM1M30.qrEBpARgfuWF74zHoRzGJyWjgxN_oCG5DdKjPVGJYxk')
      ]
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger que executa após atualização na tabela produtos
DROP TRIGGER IF EXISTS trigger_alertas_estoque ON public.produtos;
CREATE TRIGGER trigger_alertas_estoque
  AFTER UPDATE ON public.produtos
  FOR EACH ROW
  EXECUTE FUNCTION public.verificar_alertas_estoque();
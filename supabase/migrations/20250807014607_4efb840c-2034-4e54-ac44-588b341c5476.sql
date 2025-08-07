-- Corrigir problemas de segurança identificados pelo linter

-- 1. Corrigir função com search_path seguro
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. Corrigir função handle_new_user com search_path seguro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, nome_exibicao)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'nome_completo',
    new.raw_user_meta_data ->> 'nome_exibicao'
  );
  RETURN new;
END;
$function$;
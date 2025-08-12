-- Restringir acesso ao view historico_vendas_public
REVOKE ALL ON TABLE public.historico_vendas_public FROM PUBLIC;
REVOKE ALL ON TABLE public.historico_vendas_public FROM anon;
GRANT SELECT ON TABLE public.historico_vendas_public TO authenticated;

-- Garantir que o RPC não possa ser executado anonimamente
REVOKE ALL ON FUNCTION public.get_historico_vendas_masked(date, date, text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_historico_vendas_masked(date, date, text, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_historico_vendas_masked(date, date, text, integer, integer) TO authenticated;

-- Corrigir avisos do linter: definir search_path fixo nas funções utilitárias
ALTER FUNCTION public.mask_document(text) SET search_path TO public;
ALTER FUNCTION public.mask_name(text) SET search_path TO public;
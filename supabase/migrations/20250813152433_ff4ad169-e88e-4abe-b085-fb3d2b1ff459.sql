BEGIN;

-- Garantias
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY; ALTER TABLE public.profiles          FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos           ENABLE ROW LEVEL SECURITY; ALTER TABLE public.pedidos           FORCE ROW LEVEL SECURITY;
ALTER TABLE public.historico_vendas  ENABLE ROW LEVEL SECURITY; ALTER TABLE public.historico_vendas  FORCE ROW LEVEL SECURITY;

-- Remover SELECT direto (deixe só mutações que já existirem; senão, negar)
DO $$
DECLARE p text;
BEGIN
  -- profiles
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='profiles' LOOP
    IF p ILIKE '%SELECT%' OR p ILIKE '%read%' THEN
      EXECUTE 'DROP POLICY IF EXISTS "'||p||'" ON public.profiles';
    END IF;
  END LOOP;
  -- pedidos
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='pedidos' LOOP
    IF p ILIKE '%SELECT%' THEN
      EXECUTE 'DROP POLICY IF EXISTS "'||p||'" ON public.pedidos';
    END IF;
  END LOOP;
  -- historico_vendas
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='historico_vendas' LOOP
    IF p ILIKE '%SELECT%' THEN
      EXECUTE 'DROP POLICY IF EXISTS "'||p||'" ON public.historico_vendas';
    END IF;
  END LOOP;
END$$;

-- Recriar apenas policies de INSERT/UPDATE/DELETE que já usamos (se necessário).
-- (Se o app não faz mutações diretas, não crie policies de ALL; deixe sem.)

-- RPCs SECURITY DEFINER
-- 1) Perfis (admin): retorna campos mínimos e exige users:read + mesma org
CREATE OR REPLACE FUNCTION public.admin_list_profiles(_search text DEFAULT NULL, _limit int DEFAULT 100, _offset int DEFAULT 0)
RETURNS TABLE (
  id uuid, nome_completo text, nome_exibicao text, email text, telefone text, cargo text, organizacao_id uuid
) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.nome_completo, p.nome_exibicao, (SELECT email FROM auth.users WHERE id = p.id), p.telefone, p.cargo, p.organizacao_id
  FROM public.profiles p
  WHERE p.organizacao_id = public.get_current_org_id()
    AND public.has_permission('users:read')
    AND (_search IS NULL OR p.nome_completo ILIKE '%'||_search||'%' OR p.nome_exibicao ILIKE '%'||_search||'%')
  ORDER BY p.nome_completo
  LIMIT COALESCE(_limit,100) OFFSET COALESCE(_offset,0);
$$;

REVOKE ALL ON FUNCTION public.admin_list_profiles(text,int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles(text,int,int) TO authenticated;

-- 2) Pedidos (mascarado o que precisar) — exige orders:read + mesma org
CREATE OR REPLACE FUNCTION public.get_pedidos_masked(
  _start date DEFAULT NULL,
  _end   date DEFAULT NULL,
  _search text DEFAULT NULL,
  _limit  int DEFAULT 100,
  _offset int DEFAULT 0
) RETURNS SETOF public.pedidos LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT p.*
  FROM public.pedidos p
  JOIN public.integration_accounts ia ON ia.id = p.integration_account_id
  WHERE ia.organization_id = public.get_current_org_id()
    AND public.has_permission('orders:read')
    AND (_start IS NULL OR p.data_pedido >= _start)
    AND (_end   IS NULL OR p.data_pedido <= _end)
    AND (_search IS NULL OR p.nome_cliente ILIKE '%'||_search||'%' OR p.numero ILIKE '%'||_search||'%')
  ORDER BY p.data_pedido DESC, p.created_at DESC
  LIMIT COALESCE(_limit,100) OFFSET COALESCE(_offset,0);
$$;

REVOKE ALL ON FUNCTION public.get_pedidos_masked(date,date,text,int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pedidos_masked(date,date,text,int,int) TO authenticated;

-- 3) Vendas já tem RPC mascarado; só garanta EXECUTE
REVOKE ALL ON FUNCTION public.get_historico_vendas_masked(date,date,text,int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_historico_vendas_masked(date,date,text,int,int) TO authenticated;

COMMIT;
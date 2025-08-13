BEGIN;

-- Garantias
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles FROM PUBLIC, anon;

-- Limpa TODAS as policies existentes (idempotente)
DO $$
DECLARE p text;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname='public' AND tablename='profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.profiles', p);
  END LOOP;
END $$;

-- Policies mínimas: SELF ONLY
CREATE POLICY "profiles: self read"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles: self insert"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles: self update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- RPC para admins listarem perfis da MESMA org com permissão users:read
CREATE OR REPLACE FUNCTION public.admin_list_profiles(_search text DEFAULT NULL)
RETURNS SETOF public.profiles
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.*
  FROM public.profiles p
  WHERE p.organizacao_id = public.get_current_org_id()
    AND public.has_permission('users:read')
    AND (
      _search IS NULL
      OR p.nome_completo ILIKE '%'||_search||'%'
      OR p.nome_exibicao ILIKE '%'||_search||'%'
    );
$$;

REVOKE ALL ON FUNCTION public.admin_list_profiles(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles(text) TO authenticated;

COMMIT;
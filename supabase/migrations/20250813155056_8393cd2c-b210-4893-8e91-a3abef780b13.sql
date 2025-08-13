BEGIN;

-- Garantias
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles FROM PUBLIC, anon;

-- Remover TODAS as policies existentes
DO $$
DECLARE p text;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.profiles', p);
  END LOOP;
END $$;

-- SELECT: self
CREATE POLICY "profiles: self read"
ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

-- SELECT: admin (mesma org) com permissão
CREATE POLICY "profiles: admin read same org"
ON public.profiles
FOR SELECT TO authenticated
USING (
  public.has_permission('users:read')
  AND organizacao_id = public.get_current_org_id()
);

-- INSERT/UPDATE: self
CREATE POLICY "profiles: self insert"
ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles: self update"
ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- (Opcional) UPDATE por admin
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.app_permissions WHERE key='users:manage') THEN
    CREATE POLICY "profiles: admin manage same org"
    ON public.profiles
    FOR UPDATE TO authenticated
    USING (
      public.has_permission('users:manage')
      AND organizacao_id = public.get_current_org_id()
    )
    WITH CHECK (
      public.has_permission('users:manage')
      AND organizacao_id = public.get_current_org_id()
    );
  END IF;
END $$;

COMMIT;
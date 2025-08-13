BEGIN;

-- Garantias (RLS + FORCE + revokes)
ALTER TABLE public.pedidos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos            FORCE ROW LEVEL SECURITY;
ALTER TABLE public.historico_vendas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_vendas   FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.pedidos          FROM PUBLIC, anon;
REVOKE ALL ON public.historico_vendas FROM PUBLIC, anon;

-- Limpar policies antigas de SELECT
DO $$
DECLARE p text;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname='public' AND tablename='pedidos' AND cmd='SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.pedidos', p);
  END LOOP;
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname='public' AND tablename='historico_vendas' AND cmd='SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.historico_vendas', p);
  END LOOP;
END $$;

-- Policy explícita de NEGAR TUDO (satisfaz o scanner e mantém acesso fechado)
CREATE POLICY "pedidos: deny select"
  ON public.pedidos
  FOR SELECT TO authenticated, anon
  USING (false);

CREATE POLICY "hv: deny select"
  ON public.historico_vendas
  FOR SELECT TO authenticated, anon
  USING (false);

COMMIT;
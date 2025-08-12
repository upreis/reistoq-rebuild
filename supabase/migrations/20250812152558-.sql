-- Backfill org IDs in 3 steps + drop permissive policies
DO $$
DECLARE
  v_fallback_org uuid := '9d52ba63-0de8-4d77-8b57-ed14d3189768';
BEGIN
  -- Clear previous step3 reports to avoid duplicates
  DELETE FROM public._backfill_report_org_nulls 
  WHERE table_name IN ('mapeamentos_depara','historico_depara','sync_control')
    AND reason LIKE 'step3%';

  -- STEP 1: Derivação por produto (mapeamentos_depara)
  UPDATE public.mapeamentos_depara m
  SET organization_id = ia.organization_id
  FROM public.produtos p
  JOIN public.integration_accounts ia ON ia.id = p.integration_account_id
  WHERE m.organization_id IS NULL
    AND ia.organization_id IS NOT NULL
    AND (m.sku_correspondente = p.sku_interno OR m.sku_simples = p.sku_interno);

  -- STEP 1b: historico_depara herda do mapeamento
  UPDATE public.historico_depara h
  SET organization_id = m.organization_id
  FROM public.mapeamentos_depara m
  WHERE h.organization_id IS NULL
    AND h.mapeamento_id = m.id
    AND m.organization_id IS NOT NULL;

  -- STEP 2: Derivação por autor (último historico por mapeamento)
  WITH last_hist AS (
    SELECT h.mapeamento_id, (ARRAY_AGG(h.usuario_id ORDER BY h.created_at DESC))[1] AS usuario_id
    FROM public.historico_depara h
    WHERE h.usuario_id IS NOT NULL
    GROUP BY h.mapeamento_id
  )
  UPDATE public.mapeamentos_depara m
  SET organization_id = p.organizacao_id
  FROM last_hist lh
  JOIN public.profiles p ON p.id = lh.usuario_id
  WHERE m.organization_id IS NULL
    AND m.id = lh.mapeamento_id
    AND p.organizacao_id IS NOT NULL;

  -- STEP 2b: historico_depara diretamente via usuario_id
  UPDATE public.historico_depara h
  SET organization_id = p.organizacao_id
  FROM public.profiles p
  WHERE h.organization_id IS NULL
    AND h.usuario_id = p.id
    AND p.organizacao_id IS NOT NULL;

  -- STEP 3a: mapeamentos_depara via criador (acao = 'criacao') + report
  WITH creators AS (
    SELECT DISTINCT ON (h.mapeamento_id)
           h.mapeamento_id, h.usuario_id, p.organizacao_id
    FROM public.historico_depara h
    LEFT JOIN public.profiles p ON p.id = h.usuario_id
    WHERE h.acao = 'criacao'
    ORDER BY h.mapeamento_id, h.created_at DESC
  ),
  to_update AS (
    SELECT m.id, c.organizacao_id
    FROM public.mapeamentos_depara m
    JOIN creators c ON c.mapeamento_id = m.id
    WHERE m.organization_id IS NULL AND c.organizacao_id IS NOT NULL
  )
  INSERT INTO public._backfill_report_org_nulls (id, table_name, reason)
  SELECT id, 'mapeamentos_depara', 'step3_creator_org' FROM to_update;

  UPDATE public.mapeamentos_depara m
  SET organization_id = c.organizacao_id
  FROM creators c
  WHERE m.organization_id IS NULL
    AND m.id = c.mapeamento_id
    AND c.organizacao_id IS NOT NULL;

  -- STEP 3b: mapeamentos_depara fallback p/ org atual + report
  WITH to_update AS (
    SELECT m.id
    FROM public.mapeamentos_depara m
    WHERE m.organization_id IS NULL
  )
  INSERT INTO public._backfill_report_org_nulls (id, table_name, reason)
  SELECT id, 'mapeamentos_depara', 'step3_fallback_current_org' FROM to_update;

  UPDATE public.mapeamentos_depara
  SET organization_id = v_fallback_org
  WHERE organization_id IS NULL;

  -- STEP 3c: historico_depara - tentar criador e depois fallback + report
  WITH to_creator AS (
    SELECT h.id, p.organizacao_id
    FROM public.historico_depara h
    LEFT JOIN public.profiles p ON p.id = h.usuario_id
    WHERE h.organization_id IS NULL AND p.organizacao_id IS NOT NULL
  )
  INSERT INTO public._backfill_report_org_nulls (id, table_name, reason)
  SELECT id, 'historico_depara', 'step3_creator_org' FROM to_creator;

  UPDATE public.historico_depara h
  SET organization_id = tc.organizacao_id
  FROM to_creator tc
  WHERE h.id = tc.id;

  WITH to_fallback AS (
    SELECT h.id
    FROM public.historico_depara h
    WHERE h.organization_id IS NULL
  )
  INSERT INTO public._backfill_report_org_nulls (id, table_name, reason)
  SELECT id, 'historico_depara', 'step3_fallback_current_org' FROM to_fallback;

  UPDATE public.historico_depara
  SET organization_id = v_fallback_org
  WHERE organization_id IS NULL;

  -- STEP 3d: sync_control fallback + report
  WITH to_update AS (
    SELECT s.id FROM public.sync_control s WHERE s.organization_id IS NULL
  )
  INSERT INTO public._backfill_report_org_nulls (id, table_name, reason)
  SELECT id, 'sync_control', 'step3_fallback_current_org' FROM to_update;

  UPDATE public.sync_control
  SET organization_id = v_fallback_org
  WHERE organization_id IS NULL;

  -- DROP permissive "true" policies se existirem
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='mapeamentos_depara' 
      AND policyname='Permitir acesso total aos mapeamentos DE/PARA'
  ) THEN
    EXECUTE 'DROP POLICY "Permitir acesso total aos mapeamentos DE/PARA" ON public.mapeamentos_depara';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='historico_depara' 
      AND policyname='Permitir acesso total ao histórico DePara'
  ) THEN
    EXECUTE 'DROP POLICY "Permitir acesso total ao histórico DePara" ON public.historico_depara';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='sync_control' 
      AND policyname='Permitir acesso total ao controle de sync'
  ) THEN
    EXECUTE 'DROP POLICY "Permitir acesso total ao controle de sync" ON public.sync_control';
  END IF;
END $$;
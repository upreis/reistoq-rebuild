-- Backfill function to assign NULL organization_id configs to current user's org
CREATE OR REPLACE FUNCTION public.backfill_config_for_current_org()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  org uuid;
  updated_count integer := 0;
BEGIN
  org := public.get_current_org_id();
  IF org IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Organização não encontrada para o usuário atual');
  END IF;

  UPDATE public.configuracoes c
  SET organization_id = org, updated_at = now()
  WHERE c.organization_id IS NULL
    AND c.chave <> 'tiny_token';

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RETURN json_build_object('success', true, 'organization_id', org, 'updated', updated_count);
END;
$$;
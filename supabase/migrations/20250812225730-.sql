-- historico_vendas_public is a VIEW; enable security barrier for safer planning
BEGIN;

ALTER VIEW public.historico_vendas_public SET (security_barrier = true);

COMMIT;
-- RLS mínimo + org_id (depara/histórico/sync) + leaked-password on (manual no painel)
-- 1) Profiles: self-read
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários podem ver todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "profiles: self read" ON public.profiles;
CREATE POLICY "profiles: self read"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- 2) movimentacoes_estoque: SELECT por organização via produtos -> integration_accounts
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acesso total às movimentações" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "Usuários autenticados podem acessar movimentações" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "movimentacoes_estoque: org members read" ON public.movimentacoes_estoque;
CREATE POLICY "movimentacoes_estoque: org members read"
ON public.movimentacoes_estoque
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.produtos p
    LEFT JOIN public.integration_accounts ia ON ia.id = p.integration_account_id
    WHERE p.id = movimentacoes_estoque.produto_id
      AND (
        p.integration_account_id IS NULL
        OR ia.organization_id = public.get_current_org_id()
      )
  )
);

-- 3) Adicionar organization_id nas tabelas sem coluna de org
ALTER TABLE public.mapeamentos_depara ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.historico_depara ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.sync_control ADD COLUMN IF NOT EXISTS organization_id uuid;

-- 3b) Backfill mapeamentos_depara.organization_id
WITH prod_match AS (
  SELECT m.id AS m_id,
         COALESCE(
           -- via sku_correspondente
           (SELECT ia.organization_id
            FROM public.produtos p
            LEFT JOIN public.integration_accounts ia ON ia.id = p.integration_account_id
            WHERE p.sku_interno = m.sku_correspondente
            LIMIT 1),
           -- via sku_simples
           (SELECT ia.organization_id
            FROM public.produtos p
            LEFT JOIN public.integration_accounts ia ON ia.id = p.integration_account_id
            WHERE p.sku_interno = m.sku_simples
            LIMIT 1),
           -- via criador (historico_depara.usuario_id)
           (SELECT pr.organizacao_id
            FROM public.historico_depara hd
            JOIN public.profiles pr ON pr.id = hd.usuario_id
            WHERE hd.mapeamento_id = m.id
            ORDER BY hd.created_at DESC
            LIMIT 1)
         ) AS org_id
  FROM public.mapeamentos_depara m
  WHERE m.organization_id IS NULL
)
UPDATE public.mapeamentos_depara m
SET organization_id = prod_match.org_id
FROM prod_match
WHERE m.id = prod_match.m_id AND m.organization_id IS NULL;

-- 3c) Backfill historico_depara.organization_id a partir do mapeamento
UPDATE public.historico_depara h
SET organization_id = m.organization_id
FROM public.mapeamentos_depara m
WHERE h.mapeamento_id = m.id
  AND h.organization_id IS NULL
  AND m.organization_id IS NOT NULL;

-- 3d) Backfill sync_control.organization_id a partir de progress JSON, se existir
UPDATE public.sync_control sc
SET organization_id = (sc.progress ->> 'organization_id')::uuid
WHERE sc.organization_id IS NULL
  AND sc.progress ? 'organization_id';

-- 3e) FKs e índices
ALTER TABLE public.mapeamentos_depara
  DROP CONSTRAINT IF EXISTS mapeamentos_depara_organization_id_fkey,
  ADD CONSTRAINT mapeamentos_depara_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizacoes(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_mapeamentos_depara_org ON public.mapeamentos_depara(organization_id);

ALTER TABLE public.historico_depara
  DROP CONSTRAINT IF EXISTS historico_depara_organization_id_fkey,
  ADD CONSTRAINT historico_depara_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizacoes(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_historico_depara_org ON public.historico_depara(organization_id);

ALTER TABLE public.sync_control
  DROP CONSTRAINT IF EXISTS sync_control_organization_id_fkey,
  ADD CONSTRAINT sync_control_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizacoes(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_sync_control_org ON public.sync_control(organization_id);

-- 3f) Políticas org-based (criar agora; ativação efetiva será na troca/remoção das permissivas em sprint da flag)
-- mapeamentos_depara
DROP POLICY IF EXISTS "mapeamentos_depara: org read" ON public.mapeamentos_depara;
DROP POLICY IF EXISTS "mapeamentos_depara: org mutate" ON public.mapeamentos_depara;
CREATE POLICY "mapeamentos_depara: org read"
ON public.mapeamentos_depara
FOR SELECT
USING (organization_id = public.get_current_org_id());
CREATE POLICY "mapeamentos_depara: org mutate"
ON public.mapeamentos_depara
FOR ALL
TO authenticated
USING (organization_id = public.get_current_org_id())
WITH CHECK (organization_id = public.get_current_org_id());

-- historico_depara
DROP POLICY IF EXISTS "historico_depara: org read" ON public.historico_depara;
DROP POLICY IF EXISTS "historico_depara: org mutate" ON public.historico_depara;
CREATE POLICY "historico_depara: org read"
ON public.historico_depara
FOR SELECT
USING (organization_id = public.get_current_org_id());
CREATE POLICY "historico_depara: org mutate"
ON public.historico_depara
FOR ALL
TO authenticated
USING (organization_id = public.get_current_org_id())
WITH CHECK (organization_id = public.get_current_org_id());

-- sync_control
DROP POLICY IF EXISTS "sync_control: org read" ON public.sync_control;
DROP POLICY IF EXISTS "sync_control: org mutate" ON public.sync_control;
CREATE POLICY "sync_control: org read"
ON public.sync_control
FOR SELECT
USING (organization_id = public.get_current_org_id());
CREATE POLICY "sync_control: org mutate"
ON public.sync_control
FOR ALL
TO authenticated
USING (organization_id = public.get_current_org_id())
WITH CHECK (organization_id = public.get_current_org_id());

-- Observação: não alteramos policies de produtos; não tocamos ML/Tiny/Shopee nem edges/UI.

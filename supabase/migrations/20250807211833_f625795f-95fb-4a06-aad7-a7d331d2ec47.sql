-- Multi-conta e multi-provedor (Tiny, Shopee, Mercado Livre)
-- 1) Tipo enum para provedores
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_provider') THEN
    CREATE TYPE public.integration_provider AS ENUM ('tiny', 'shopee', 'mercadolivre');
  END IF;
END $$;

-- 2) Tabela de contas de integração (por organização)
CREATE TABLE IF NOT EXISTS public.integration_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  provider public.integration_provider NOT NULL,
  name TEXT NOT NULL,
  cnpj TEXT,
  account_identifier TEXT, -- ex: shop_id (Shopee), seller_id (ML), conta Tiny
  is_active BOOLEAN NOT NULL DEFAULT true,
  auth_data JSONB,          -- tokens/segredos específicos da conta (guardar com RLS)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT integration_accounts_org_fk
    FOREIGN KEY (organization_id) REFERENCES public.organizacoes(id) ON DELETE CASCADE
);

-- 3) Trigger para updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_integration_accounts_updated_at'
  ) THEN
    CREATE TRIGGER trg_integration_accounts_updated_at
    BEFORE UPDATE ON public.integration_accounts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 4) RLS
ALTER TABLE public.integration_accounts ENABLE ROW LEVEL SECURITY;

-- Selecionar contas da própria organização
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Contas por organização (SELECT)' AND tablename = 'integration_accounts'
  ) THEN
    CREATE POLICY "Contas por organização (SELECT)"
    ON public.integration_accounts
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.organizacao_id = integration_accounts.organization_id
      )
    );
  END IF;
END $$;

-- Inserir contas na própria organização
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Contas por organização (INSERT)' AND tablename = 'integration_accounts'
  ) THEN
    CREATE POLICY "Contas por organização (INSERT)"
    ON public.integration_accounts
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.organizacao_id = organization_id
      )
    );
  END IF;
END $$;

-- Atualizar contas da própria organização
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Contas por organização (UPDATE)' AND tablename = 'integration_accounts'
  ) THEN
    CREATE POLICY "Contas por organização (UPDATE)"
    ON public.integration_accounts
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.organizacao_id = integration_accounts.organization_id
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.organizacao_id = integration_accounts.organization_id
      )
    );
  END IF;
END $$;

-- Deletar contas da própria organização
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Contas por organização (DELETE)' AND tablename = 'integration_accounts'
  ) THEN
    CREATE POLICY "Contas por organização (DELETE)"
    ON public.integration_accounts
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.organizacao_id = integration_accounts.organization_id
      )
    );
  END IF;
END $$;

-- 5) Relacionar pedidos/produtos/itens/histórico a uma conta de integração (opcional)
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS integration_account_id UUID REFERENCES public.integration_accounts(id);
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS integration_account_id UUID REFERENCES public.integration_accounts(id);
ALTER TABLE public.itens_pedidos ADD COLUMN IF NOT EXISTS integration_account_id UUID REFERENCES public.integration_accounts(id);
ALTER TABLE public.historico_vendas ADD COLUMN IF NOT EXISTS integration_account_id UUID REFERENCES public.integration_accounts(id);

-- 6) Índices úteis
CREATE INDEX IF NOT EXISTS idx_integration_accounts_org ON public.integration_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_integration_accounts_provider ON public.integration_accounts(provider);
CREATE INDEX IF NOT EXISTS idx_pedidos_integration_account ON public.pedidos(integration_account_id);
CREATE INDEX IF NOT EXISTS idx_produtos_integration_account ON public.produtos(integration_account_id);
CREATE INDEX IF NOT EXISTS idx_itens_integration_account ON public.itens_pedidos(integration_account_id);
CREATE INDEX IF NOT EXISTS idx_histvendas_integration_account ON public.historico_vendas(integration_account_id);

-- Ensure pedidos.id has a primary key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.pedidos'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.pedidos
    ADD CONSTRAINT pedidos_pkey PRIMARY KEY (id);
  END IF;
END$$;

-- Create index to speed up common filters and ordering on pedidos
CREATE INDEX IF NOT EXISTS idx_pedidos_data_pedido ON public.pedidos (data_pedido DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_integration_account ON public.pedidos (integration_account_id);

-- Create index to speed up joins from itens_pedidos to pedidos and filters
CREATE INDEX IF NOT EXISTS idx_itens_pedidos_pedido_id ON public.itens_pedidos (pedido_id);
CREATE INDEX IF NOT EXISTS idx_itens_pedidos_integration_account ON public.itens_pedidos (integration_account_id);

-- Add FK from itens_pedidos.pedido_id -> pedidos.id if it doesn't exist yet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'itens_pedidos_pedido_fk'
  ) THEN
    ALTER TABLE public.itens_pedidos
    ADD CONSTRAINT itens_pedidos_pedido_fk
    FOREIGN KEY (pedido_id)
    REFERENCES public.pedidos(id)
    ON DELETE CASCADE
    NOT VALID;
  END IF;
END$$;

-- Try to validate the FK; if there are orphan rows, keep it NOT VALID and continue
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.itens_pedidos VALIDATE CONSTRAINT itens_pedidos_pedido_fk;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Validation of itens_pedidos_pedido_fk skipped: %', SQLERRM;
  END;
END$$;
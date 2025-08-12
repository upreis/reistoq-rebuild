-- 1) Funções de mascaramento
CREATE OR REPLACE FUNCTION public.mask_document(doc text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits text;
  len int;
BEGIN
  IF doc IS NULL OR btrim(doc) = '' THEN
    RETURN NULL;
  END IF;
  digits := regexp_replace(doc, '\\D', '', 'g');
  len := length(digits);
  IF len <= 4 THEN
    RETURN repeat('*', GREATEST(len - 1, 0)) || right(digits, LEAST(len, 1));
  ELSIF len <= 11 THEN -- CPF
    RETURN repeat('*', len - 2) || right(digits, 2);
  ELSE -- CNPJ ou outros maiores
    RETURN repeat('*', len - 4) || right(digits, 4);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.mask_name(full_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  n text;
  parts text[];
BEGIN
  IF full_name IS NULL OR btrim(full_name) = '' THEN
    RETURN NULL;
  END IF;
  n := btrim(full_name);
  parts := regexp_split_to_array(n, '\\s+');
  IF array_length(parts, 1) = 1 THEN
    RETURN left(parts[1], 1) || '***';
  ELSE
    RETURN parts[1] || ' ' || left(parts[array_length(parts,1)], 1) || '.';
  END IF;
END;
$$;

-- 2) Registrar permissão para visualizar PII de vendas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.app_permissions WHERE key = 'vendas:view_pii'
  ) THEN
    INSERT INTO public.app_permissions (key, name, description)
    VALUES ('vendas:view_pii', 'Ver PII de vendas', 'Permite visualizar dados pessoais (nome/documento) não mascarados em histórico de vendas.');
  END IF;
END$$;

-- 3) RPC com mascaramento condicional por permissão
CREATE OR REPLACE FUNCTION public.get_historico_vendas_masked(
  _start date DEFAULT NULL,
  _end date DEFAULT NULL,
  _search text DEFAULT NULL,
  _limit integer DEFAULT 100,
  _offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  id_unico text,
  numero_pedido text,
  sku_produto text,
  descricao text,
  quantidade integer,
  valor_unitario numeric,
  valor_total numeric,
  cliente_nome text,
  cliente_documento text,
  status text,
  observacoes text,
  data_pedido date,
  created_at timestamptz,
  updated_at timestamptz,
  ncm text,
  codigo_barras text,
  pedido_id text,
  cpf_cnpj text,
  valor_frete numeric,
  data_prevista date,
  obs text,
  obs_interna text,
  cidade text,
  uf text,
  url_rastreamento text,
  situacao text,
  codigo_rastreamento text,
  numero_ecommerce text,
  valor_desconto numeric,
  numero_venda text,
  sku_estoque text,
  sku_kit text,
  qtd_kit integer,
  total_itens integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH org AS (
    SELECT public.get_current_org_id() AS org_id
  ), base AS (
    SELECT hv.*
    FROM public.historico_vendas hv
    JOIN public.integration_accounts ia ON ia.id = hv.integration_account_id
    CROSS JOIN org
    WHERE ia.organization_id = org.org_id
      AND (_start IS NULL OR hv.data_pedido >= _start)
      AND (_end IS NULL OR hv.data_pedido <= _end)
      AND (
        _search IS NULL OR _search = '' OR
        hv.numero_pedido ILIKE '%' || _search || '%' OR
        hv.sku_produto ILIKE '%' || _search || '%' OR
        hv.descricao ILIKE '%' || _search || '%'
      )
    ORDER BY hv.data_pedido DESC, hv.created_at DESC
    LIMIT COALESCE(_limit, 100) OFFSET COALESCE(_offset, 0)
  )
  SELECT 
    id,
    id_unico,
    numero_pedido,
    sku_produto,
    descricao,
    quantidade,
    valor_unitario,
    valor_total,
    CASE WHEN public.has_permission('vendas:view_pii') THEN cliente_nome ELSE public.mask_name(cliente_nome) END AS cliente_nome,
    CASE WHEN public.has_permission('vendas:view_pii') THEN cliente_documento ELSE public.mask_document(cliente_documento) END AS cliente_documento,
    status,
    observacoes,
    data_pedido,
    created_at,
    updated_at,
    ncm,
    codigo_barras,
    pedido_id,
    CASE WHEN public.has_permission('vendas:view_pii') THEN cpf_cnpj ELSE public.mask_document(cpf_cnpj) END AS cpf_cnpj,
    valor_frete,
    data_prevista,
    obs,
    obs_interna,
    cidade,
    uf,
    url_rastreamento,
    situacao,
    codigo_rastreamento,
    numero_ecommerce,
    valor_desconto,
    numero_venda,
    sku_estoque,
    sku_kit,
    qtd_kit,
    total_itens
  FROM base;
$$;

GRANT EXECUTE ON FUNCTION public.get_historico_vendas_masked(date, date, text, integer, integer) TO authenticated;

-- 4) View pública com mascaramento por padrão (respeita RLS da tabela base)
CREATE OR REPLACE VIEW public.historico_vendas_public
WITH (security_invoker = on)
AS
SELECT
  hv.id,
  hv.id_unico,
  hv.numero_pedido,
  hv.sku_produto,
  hv.descricao,
  hv.quantidade,
  hv.valor_unitario,
  hv.valor_total,
  public.mask_name(hv.cliente_nome) AS cliente_nome,
  public.mask_document(hv.cliente_documento) AS cliente_documento,
  hv.status,
  hv.observacoes,
  hv.data_pedido,
  hv.created_at,
  hv.updated_at,
  hv.ncm,
  hv.codigo_barras,
  hv.pedido_id,
  public.mask_document(hv.cpf_cnpj) AS cpf_cnpj,
  hv.valor_frete,
  hv.data_prevista,
  hv.obs,
  hv.obs_interna,
  hv.cidade,
  hv.uf,
  hv.url_rastreamento,
  hv.situacao,
  hv.codigo_rastreamento,
  hv.numero_ecommerce,
  hv.valor_desconto,
  hv.numero_venda,
  hv.sku_estoque,
  hv.sku_kit,
  hv.qtd_kit,
  hv.total_itens
FROM public.historico_vendas hv;

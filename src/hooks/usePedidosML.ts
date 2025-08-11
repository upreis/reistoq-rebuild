import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { ItemPedido } from '@/hooks/useItensPedidos';

export type Filtros = {
  dataInicio?: string;
  dataFinal?: string;
  situacoes?: string[];
  busca?: string;
  accountId?: string; // 'all' para todas
  integrationAccountId?: string; // não usado aqui
  fulfillmentOnly?: boolean;
  page?: number;
  pageSize?: number;
};

export type ResultadoPedido = ItemPedido;

export type UsePedidosReturn = {
  itens: ResultadoPedido[];
  loading: boolean;
  error: string | null;
  total?: number;
  fetchPage: (page?: number) => Promise<void>;
  refetch: () => Promise<void>;
  lastRequestId?: string;
};

function parseToISO(d?: string) {
  if (!d) return '';
  if (d.includes('/')) {
    const [dd, mm, yyyy] = d.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  return d;
}

export function usePedidosML(filtros: Filtros): UsePedidosReturn {
  const [itens, setItens] = useState<ResultadoPedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [lastRequestId, setLastRequestId] = useState<string | undefined>(undefined);
  const pageRef = useRef(filtros.page || 1);
  const pageSizeRef = useRef(filtros.pageSize || 100);

  const buildQuery = () => {
    const from = parseToISO(filtros.dataInicio);
    const to = parseToISO(filtros.dataFinal);
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    qs.set('expand', 'details');
    const limit = String(pageSizeRef.current || 100);
    const offset = String(((pageRef.current || 1) - 1) * (pageSizeRef.current || 100));
    qs.set('limit', limit);
    qs.set('offset', offset);

    const allowedMLStatuses = new Set(['paid', 'cancelled', 'confirmed', 'payment_required', 'payment_in_process', 'shipped', 'delivered']);
    const status = filtros.situacoes?.[0];
    if (status) {
      const mapTinyToML: Record<string, string> = {
        'em aberto': 'confirmed',
        'aprovado': 'paid',
        'cancelado': 'cancelled',
        'não entregue': '',
        'nao entregue': '',
        'preparando envio': '',
        'faturado': '',
        'pronto para envio': '',
        'enviado': '',
        'entregue': '',
      };
      const key = status.toLowerCase();
      const normalized = mapTinyToML[key] ?? key;
      if (normalized && allowedMLStatuses.has(normalized)) qs.set('status', normalized);
    }

    if (filtros.fulfillmentOnly) qs.set('logistics_type', 'fulfillment');

    return qs;
  };

  const mapResultsToItems = (results: any[], empresaLabel: string, integrationAccountId?: string): ItemPedido[] =>
    results.flatMap((order: any) => {
      const buyer = order.buyer || {};
      const items = order.order_items || [];
      return items.map((oi: any, idx: number) => ({
        id: `${order.id}-${idx}`,
        pedido_id: String(order.id),
        numero_pedido: String(order.id),
        sku: (oi?.item?.seller_sku ?? ''),
        descricao: oi?.item?.title || 'Item',
        quantidade: oi?.quantity || 1,
        valor_unitario: oi?.unit_price || order?.total_amount || 0,
        valor_total: (oi?.unit_price || 0) * (oi?.quantity || 1),
        numero_ecommerce: String(order.id),
        nome_cliente: `${buyer?.first_name || ''} ${buyer?.last_name || ''}`.trim() || buyer?.nickname || 'Cliente ML',
        cpf_cnpj: buyer?.billing_info?.doc_number || undefined,
        cidade: order?.shipping?.receiver_address?.city?.name || undefined,
        uf: order?.shipping?.receiver_address?.state?.id || undefined,
        data_pedido: (order?.date_created || '').slice(0, 10),
        data_prevista: undefined,
        situacao: order?.status || 'Aprovado',
        codigo_rastreamento: order?.shipping?.tracking_number || undefined,
        url_rastreamento: order?.shipping?.tracking_url || undefined,
        obs: undefined,
        obs_interna: undefined,
        valor_frete: order?.shipping_cost || 0,
        valor_desconto: 0,
        empresa: empresaLabel,
        numero_venda: String(order?.id),
        integration_account_id: integrationAccountId,
      }));
    });

  const callML = async () => {
    setLoading(true);
    setError(null);
    const t0 = performance.now();
    let requestId = '';
    try {
      const { data: session } = await supabase.auth.getSession();
      const headers = {
        'Authorization': session.session ? `Bearer ${session.session.access_token}` : '',
        'apikey': (supabase as any).headers?.apikey || ''
      } as const;

      const qs = buildQuery();
      const accId = filtros.accountId;

      let mapped: ItemPedido[] = [];
      let respStatus = 0;

      if (!accId || accId === 'all') {
        qs.set('all', 'true');
        const resp = await fetch(`https://tdjyfqnxvjgossuncpwm.supabase.co/functions/v1/mercadolivre-orders-proxy?${qs.toString()}`, { headers });
        respStatus = resp.status;
        requestId = resp.headers.get('x-request-id') || '';
        setLastRequestId(requestId || undefined);
        const ct = resp.headers.get('content-type') || '';
        const text = await resp.text();
        let json: any = null;
        if (ct.includes('application/json')) { try { json = text ? JSON.parse(text) : null; } catch (_) { json = { raw: text }; } }
        else { json = { raw: text }; }
        if (!resp.ok) {
          const msg = (json && (json.error || json.message || json.details || text)) || `Erro HTTP ${resp.status}`;
          throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
        }
        const results = (json && (json.results || json.orders)) || [];
        mapped = mapResultsToItems(Array.isArray(results) ? results : [], 'Mercado Livre');
        setTotal(json?.paging?.total || results.length);
      } else {
        qs.set('account_id', accId);
        const resp = await fetch(`https://tdjyfqnxvjgossuncpwm.supabase.co/functions/v1/mercadolivre-orders-proxy?${qs.toString()}`, { headers });
        respStatus = resp.status;
        requestId = resp.headers.get('x-request-id') || '';
        setLastRequestId(requestId || undefined);
        const ct = resp.headers.get('content-type') || '';
        const text = await resp.text();
        let json: any = null;
        if (ct.includes('application/json')) { try { json = text ? JSON.parse(text) : null; } catch (_) { json = { raw: text }; } }
        else { json = { raw: text }; }
        if (!resp.ok) {
          const msg = (json && (json.error || json.message || json.details || text)) || `Erro HTTP ${resp.status}`;
          throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
        }
        const results = (json && (json.results || json.orders)) || [];
        const empresaLabel = filtros.accountId || 'Mercado Livre';
        mapped = mapResultsToItems(Array.isArray(results) ? results : [], empresaLabel, accId);
        setTotal(json?.paging?.total || results.length);
      }

      // Busca local por número/cliente (opcional)
      let filtered = mapped;
      if (filtros.busca) {
        const q = String(filtros.busca).toLowerCase();
        filtered = filtered.filter(i =>
          String(i.numero_pedido).toLowerCase().includes(q) ||
          (i.nome_cliente || '').toLowerCase().includes(q)
        );
      }

      setItens(filtered);
      toast({ title: 'Pedidos ML carregados', description: `${filtered.length} itens` });
      const t1 = performance.now();
      console.info('ML.fetch', { status: respStatus, requestId, ms: Math.round(t1 - t0), count: filtered.length });
    } catch (e: any) {
      const t1 = performance.now();
      console.error('ML.fetch.error', { ms: Math.round(t1 - t0), err: e?.message || String(e), requestId });
      setError(e?.message || 'Falha ao buscar ML');
      toast({ title: 'Erro', description: `${e?.message || 'Falha ao buscar ML'}${requestId ? ` (req ${requestId})` : ''}`, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchPage = async (page?: number) => {
    if (page) pageRef.current = page;
    await callML();
  };

  const refetch = async () => {
    await callML();
  };

  // Não buscar automaticamente para manter comportamento do botão Buscar
  useEffect(() => {
    pageRef.current = filtros.page || 1;
    pageSizeRef.current = filtros.pageSize || 100;
  }, [filtros.page, filtros.pageSize]);

  return { itens, loading, error, total, fetchPage, refetch, lastRequestId };
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Filtros, UsePedidosReturn } from "@/config/features";

export function usePedidosShopee(initialFiltros?: Partial<Filtros>): UsePedidosReturn {
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [page, setPage] = useState<number>(initialFiltros?.page || 1);
  const [pageSize, setPageSize] = useState<number>(initialFiltros?.pageSize || 50);
  const [lastRequestId, setLastRequestId] = useState<string | undefined>(undefined);
  const [ms, setMs] = useState<number | undefined>(undefined);
  const filtrosRef = useRef<Partial<Filtros>>(initialFiltros || {});

  const headersPromise = useMemo(async () => {
    const { data: session } = await supabase.auth.getSession();
    return {
      Authorization: session.session ? `Bearer ${session.session.access_token}` : "",
      apikey: (supabase as any).headers?.apikey || "",
    } as const;
  }, []);

  const buildQuery = useCallback((f?: Partial<Filtros>) => {
    const p = new URLSearchParams();
    const toISO = (d?: string) => {
      if (!d) return "";
      if (d.includes("/")) { const [dd, mm, yyyy] = d.split("/"); return `${yyyy}-${mm}-${dd}`; }
      return d;
    };
    const from = toISO(f?.dataInicio);
    const to = toISO(f?.dataFinal);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    const effPage = f?.page ?? page;
    const effPageSize = f?.pageSize ?? pageSize;
    const offset = Math.max(0, (effPage - 1) * effPageSize);
    p.set("limit", String(effPageSize));
    p.set("offset", String(offset));
    return p;
  }, [page, pageSize]);

  const refetch = useCallback(async () => {
    const t0 = performance.now();
    try {
      setLoading(true);
      setError(null);
      const qs = buildQuery(filtrosRef.current);
      const headers = await headersPromise;
      const resp = await fetch(`https://tdjyfqnxvjgossuncpwm.supabase.co/functions/v1/shopee-orders-proxy?${qs.toString()}`, { headers });
      const reqId = resp.headers.get('x-request-id') || undefined;
      setLastRequestId(reqId);
      const ct = resp.headers.get('content-type') || '';
      const raw = await resp.text();
      const json = ct.includes('application/json') && raw ? JSON.parse(raw) : undefined;
      if (!resp.ok) {
        const msg = json?.error || json?.message || raw || `HTTP ${resp.status}`;
        throw new Error(msg);
      }
      const results = (json?.results || []) as any[];
      // Map básico para formato interno (mantendo 1:1 com o esperado pela UI)
      const mapped = results.flatMap((order: any) => {
        const buyer = order?.buyer || {};
        const items = order?.items || [];
        return items.map((it: any, idx: number) => ({
          id: `${order.id || order.order_sn}-${idx}`,
          pedido_id: String(order.id || order.order_sn),
          numero_pedido: String(order.id || order.order_sn),
          sku: it?.sku || it?.item_sku || it?.item_id || 'SKU',
          descricao: it?.name || it?.item_name || 'Item',
          quantidade: it?.quantity || it?.qty || 1,
          valor_unitario: it?.price || order?.total_amount || 0,
          valor_total: (it?.price || 0) * (it?.quantity || 1),
          numero_ecommerce: String(order.id || order.order_sn),
          nome_cliente: buyer?.name || buyer?.username || 'Cliente Shopee',
          data_pedido: (order?.create_time || order?.create_date || '').slice(0,10),
          situacao: order?.status || 'Aprovado',
          empresa: 'Shopee',
          numero_venda: String(order?.id || order.order_sn),
        }));
      });
      setItens(mapped);
      setTotal(json?.paging?.total || mapped.length);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Falha ao buscar Shopee');
    } finally {
      setMs(Math.round(performance.now() - t0));
      setLoading(false);
    }
  }, [buildQuery, headersPromise]);

  const fetchPage = useCallback(async (p?: number) => {
    if (typeof p === 'number') setPage(p);
    await refetch();
  }, [refetch]);

  useEffect(() => {
    filtrosRef.current = { ...filtrosRef.current, ...initialFiltros, page, pageSize };
  }, [initialFiltros, page, pageSize]);

  return { itens, loading, error, total, fetchPage, refetch, lastRequestId, ms, reqId: lastRequestId };
}

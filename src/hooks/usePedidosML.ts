import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Filtros, UsePedidosReturn } from "@/config/features";
import { toMLDateISO } from "@/lib/date-providers";

// Map Tiny-like statuses to ML when possible
const mapTinyToML: Record<string, string> = {
  "em aberto": "confirmed",
  "aprovado": "paid",
  "cancelado": "cancelled",
  "não entregue": "",
  "nao entregue": "",
  "preparando envio": "",
  "faturado": "",
  "pronto para envio": "",
  "enviado": "",
  "entregue": "",
};

const allowedMLStatuses = new Set([
  "paid",
  "cancelled",
  "confirmed",
  "payment_required",
  "payment_in_process",
]);


export function usePedidosML(initialFiltros?: Partial<Filtros>): UsePedidosReturn {
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

  const mapResultsToItems = useCallback((results: any[], empresaLabel: string) => {
    return results.flatMap((order: any) => {
      const buyer = order.buyer || {};
      const items = order.order_items || [];
      return items.map((oi: any, idx: number) => ({
        id: `${order.id}-${idx}`,
        pedido_id: String(order.id),
        numero_pedido: String(order.id),
        sku: oi?.item?.seller_sku || oi?.item?.sku || oi?.item?.id || "SKU",
        descricao: oi?.item?.title || "Item",
        quantidade: oi?.quantity || 1,
        valor_unitario: oi?.unit_price || order?.total_amount || 0,
        valor_total: (oi?.unit_price || 0) * (oi?.quantity || 1),
        numero_ecommerce: String(order.id),
        nome_cliente: `${buyer?.first_name || ""} ${buyer?.last_name || ""}`.trim() || buyer?.nickname || "Cliente ML",
        cpf_cnpj: buyer?.billing_info?.doc_number || undefined,
        cidade: order?.shipping?.receiver_address?.city?.name || undefined,
        uf: order?.shipping?.receiver_address?.state?.id || undefined,
        data_pedido: (order?.date_created || "").slice(0, 10),
        data_prevista: undefined,
        situacao: order?.status || "Aprovado",
        codigo_rastreamento: order?.shipping?.tracking_number || undefined,
        url_rastreamento: order?.shipping?.tracking_url || undefined,
        obs: undefined,
        obs_interna: undefined,
        valor_frete: order?.shipping_cost || 0,
        valor_desconto: 0,
        empresa: empresaLabel,
        numero_venda: String(order?.id),
      }));
    });
  }, []);

  const buildQuery = useCallback((f?: Partial<Filtros>) => {
    const p = new URLSearchParams();
    const from = toMLDateISO(f?.dataInicio);
    const to = toMLDateISO(f?.dataFinal);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    p.set("expand", "details");

    // status (use only first)
    const rawStatus = f?.situacoes?.[0];
    if (rawStatus) {
      const key = String(rawStatus).toLowerCase();
      const normalized = mapTinyToML[key] ?? key;
      if (normalized && allowedMLStatuses.has(normalized)) {
        p.set("status", normalized);
      } else {
        console.warn("[ML] Ignorando status não suportado:", rawStatus);
      }
    }

    const effPage = f?.page ?? page;
    const effPageSize = f?.pageSize ?? pageSize;
    const offset = Math.max(0, (effPage - 1) * effPageSize);
    p.set("limit", String(effPageSize));
    p.set("offset", String(offset));

    if (f?.accountId && f.accountId !== "all") p.set("account_id", f.accountId);
    if (!f?.accountId || f.accountId === "all") p.set("all", "true");

    return p;
  }, [page, pageSize]);

  const refetch = useCallback(async () => {
    const t0 = performance.now();
    try {
      setLoading(true);
      setError(null);
      const qs = buildQuery(filtrosRef.current);
      const headers = await headersPromise;
      const resp = await fetch(`https://tdjyfqnxvjgossuncpwm.supabase.co/functions/v1/mercadolivre-orders-proxy?${qs.toString()}`, { headers });
      const reqId = resp.headers.get('x-request-id') || undefined;
      setLastRequestId(reqId);

      const ct = resp.headers.get('content-type') || '';
      const raw = await resp.text();
      const json = ct.includes('application/json') && raw ? JSON.parse(raw) : undefined;
      if (!resp.ok) {
        const msg = json?.error || json?.message || raw || `HTTP ${resp.status}`;
        throw new Error(msg);
      }

      const results = (json?.results || json?.orders || []) as any[];
      const empresaLabel = filtrosRef.current?.accountId && filtrosRef.current?.accountId !== 'all' ? 'Mercado Livre' : 'Mercado Livre';
      const mapped = mapResultsToItems(Array.isArray(results) ? results : [], empresaLabel);
      setItens(mapped);
      setTotal(json?.paging?.total);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Falha ao buscar ML');
      toast({ title: 'Erro', description: e?.message || 'Falha ao buscar ML', variant: 'destructive' });
    } finally {
      setMs(Math.round(performance.now() - t0));
      setLoading(false);
    }
  }, [buildQuery, headersPromise, mapResultsToItems]);

  const fetchPage = useCallback(async (p?: number) => {
    if (typeof p === 'number') setPage(p);
    await refetch();
  }, [refetch]);

  // Auto fetch when filtros change
  useEffect(() => {
    filtrosRef.current = { ...filtrosRef.current, ...initialFiltros, page, pageSize };
  }, [initialFiltros, page, pageSize]);

  return { itens, loading, error, total, fetchPage, refetch, lastRequestId, ms, reqId: lastRequestId };
}

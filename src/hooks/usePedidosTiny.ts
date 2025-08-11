import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Filtros, UsePedidosReturn } from "@/config/features";
import { toTinyDate } from "@/lib/date-providers";
import { supabase } from "@/integrations/supabase/client";

export function usePedidosTiny(initialFiltros?: Partial<Filtros>): UsePedidosReturn {
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [page, setPage] = useState<number>(initialFiltros?.page || 1);
  const [pageSize, setPageSize] = useState<number>(initialFiltros?.pageSize || 500);
  const filtrosRef = useRef<Partial<Filtros>>(initialFiltros || {});
  const [ms, setMs] = useState<number | undefined>(undefined);

  const buildBody = useCallback((f?: Partial<Filtros>) => {
    const body: any = {
      page: f?.page ?? page,
      pageSize: Math.min(500, f?.pageSize ?? pageSize),
      dateFrom: toTinyDate(f?.dataInicio),
      dateTo: toTinyDate(f?.dataFinal),
      status: Array.isArray(f?.situacoes) ? f?.situacoes?.[0] : f?.situacoes,
      expand: "items",
    };
    if ((f as any)?.integrationAccountId) body.integration_account_id = (f as any).integrationAccountId;
    if ((f as any)?.numero) body.numero = (f as any).numero;
    return body;
  }, [page, pageSize]);

  const refetch = useCallback(async () => {
    const t0 = performance.now();
    setLoading(true);
    setError(null);
    try {
      const body = buildBody(filtrosRef.current);
      const { data, error } = await supabase.functions.invoke('tiny-orders', { body });
      if (error) throw new Error(error.message || 'Falha tiny-orders');
      const itensResp = (data?.itens || []) as any[];
      setItens(itensResp);
      setTotal(data?.total);
    } catch (e: any) {
      setError(e?.message || 'Falha tiny-orders');
      console.error('[tiny-orders]', e);
    } finally {
      setMs(Math.round(performance.now() - t0));
      setLoading(false);
    }
  }, [buildBody]);

  const fetchPage = useCallback(async (p?: number) => {
    if (typeof p === 'number') setPage(p);
    await refetch();
  }, [refetch]);

  // Atualiza filtros locais
  useEffect(() => {
    filtrosRef.current = { ...filtrosRef.current, ...initialFiltros, page, pageSize };
  }, [initialFiltros, page, pageSize]);

  return { itens, loading, error, total, fetchPage, refetch, ms };
}

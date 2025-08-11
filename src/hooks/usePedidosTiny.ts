import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toTinyDate } from "@/lib/date-providers";
import { FEATURE_TINY_EDGE, type Filtros, type UsePedidosReturn } from "@/config/features";
import { useItensPedidos } from "@/hooks/useItensPedidos";

export function usePedidosTiny(initialFiltros?: Partial<Filtros>): UsePedidosReturn {
  // Legacy path (default): use existing hook and behavior unchanged
  if (!FEATURE_TINY_EDGE) {
    const {
      itens,
      loading,
      error,
      filtros,
      atualizarFiltros,
      buscarComFiltros,
    } = useItensPedidos();

    const [page, setPage] = useState<number>(initialFiltros?.page || 1);
    const [pageSize, setPageSize] = useState<number>(initialFiltros?.pageSize || 500);

    useEffect(() => {
      // Mapear Filtros -> filtros do hook legado (mantendo comportamento)
      const mapped = {
        busca: initialFiltros?.busca ?? filtros.busca,
        dataInicio: toTinyDate(initialFiltros?.dataInicio || filtros.dataInicio),
        dataFinal: toTinyDate(initialFiltros?.dataFinal || filtros.dataFinal),
        situacoes: initialFiltros?.situacoes ?? filtros.situacoes,
      } as any;
      atualizarFiltros(mapped);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialFiltros?.busca, initialFiltros?.dataInicio, initialFiltros?.dataFinal, JSON.stringify(initialFiltros?.situacoes)]);

    const refetch = useCallback(async () => {
      const t0 = performance.now();
      await buscarComFiltros();
      (window as any).__tiny_last_ms = Math.round(performance.now() - t0);
    }, [buscarComFiltros]);

    const fetchPage = useCallback(async (p?: number) => {
      if (typeof p === 'number') setPage(p);
      await refetch();
    }, [refetch]);

    const total = useMemo(() => itens.length, [itens.length]);

    return { itens, loading, error, total, fetchPage, refetch };
  }

  // Edge path (behind FEATURE_TINY_EDGE)
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(initialFiltros?.page || 1);
  const [pageSize, setPageSize] = useState<number>(initialFiltros?.pageSize || 500);
  const [total, setTotal] = useState<number>(0);
  const [reqId, setReqId] = useState<string | undefined>(undefined);
  const [ms, setMs] = useState<number | undefined>(undefined);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const t0 = performance.now();
    try {
      const body: any = {
        page,
        pageSize,
        dateFrom: toTinyDate(initialFiltros?.dataInicio),
        dateTo: toTinyDate(initialFiltros?.dataFinal),
        expand: 'items',
      };
      const status = initialFiltros?.situacoes?.[0];
      if (status) body.status = status;
      if (initialFiltros?.busca) body.numero = initialFiltros.busca;

      const { data, error } = await supabase.functions.invoke('tiny-orders', { body });
      const reqHeader = (data as any)?.requestId || undefined;
      setReqId(reqHeader);
      if (error) throw error;

      setItens((data as any)?.itens || []);
      setTotal((data as any)?.total || 0);
      setMs(Math.round(performance.now() - t0));
      (window as any).__tiny_last_ms = Math.round(performance.now() - t0);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar Tiny');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, initialFiltros?.dataInicio, initialFiltros?.dataFinal, JSON.stringify(initialFiltros?.situacoes), initialFiltros?.busca]);

  const fetchPage = useCallback(async (p?: number) => {
    if (typeof p === 'number') setPage(p);
    await refetch();
  }, [refetch]);

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, initialFiltros?.dataInicio, initialFiltros?.dataFinal, JSON.stringify(initialFiltros?.situacoes), initialFiltros?.busca]);

  return { itens, loading, error, total, fetchPage, refetch, ms, reqId };
}

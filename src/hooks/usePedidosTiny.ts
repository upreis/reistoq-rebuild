import { useCallback, useEffect, useMemo, useState } from "react";
import type { Filtros, UsePedidosReturn } from "@/config/features";
import { useItensPedidos } from "@/hooks/useItensPedidos";

export function toTinyDate(input?: string | Date): string {
  if (!input) return '';
  if (input instanceof Date) {
    const dd = String(input.getDate()).padStart(2, '0');
    const mm = String(input.getMonth() + 1).padStart(2, '0');
    const yyyy = input.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
    }
  const s = String(input);
  if (s.includes('/')) return s; // assume DD/MM/YYYY
  if (s.includes('-')) {
    const [yyyy, mm, dd] = s.split('-');
    return `${dd}/${mm}/${yyyy}`;
  }
  return s;
}

export function usePedidosTiny(initialFiltros?: Partial<Filtros>): UsePedidosReturn {
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
    await buscarComFiltros();
  }, [buscarComFiltros]);

  const fetchPage = useCallback(async (p?: number) => {
    if (typeof p === 'number') setPage(p);
    await refetch();
  }, [refetch]);

  // Total simples por enquanto (mantém 1:1 comportamento atual de lista completa)
  const total = useMemo(() => itens.length, [itens.length]);

  return { itens, loading, error, total, fetchPage, refetch };
}

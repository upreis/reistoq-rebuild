import { useCallback, useState } from "react";
import type { Filtros, UsePedidosReturn } from "@/config/features";

export function usePedidosShopee(_initialFiltros?: Partial<Filtros>): UsePedidosReturn {
  const [itens] = useState<any[]>([]);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    return; // stub
  }, []);

  const fetchPage = useCallback(async () => {
    return; // stub
  }, []);

  return { itens, loading, error, total: 0, fetchPage, refetch };
}

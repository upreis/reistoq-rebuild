import { useCallback, useState } from 'react';

export type Filtros = {
  dataInicio?: string;
  dataFinal?: string;
  situacoes?: string[];
  busca?: string;
  accountId?: string;
  integrationAccountId?: string;
  fulfillmentOnly?: boolean;
  page?: number;
  pageSize?: number;
};

export type ResultadoPedido = any;

export type UsePedidosReturn = {
  itens: ResultadoPedido[];
  loading: boolean;
  error: string | null;
  total?: number;
  fetchPage: (page?: number) => Promise<void>;
  refetch: () => Promise<void>;
};

export function usePedidosShopee(_filtros: Filtros): UsePedidosReturn {
  const [itens] = useState<ResultadoPedido[]>([]);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);
  const [total] = useState<number>(0);

  const fetchPage = useCallback(async () => {
    const t0 = performance.now();
    const t1 = performance.now();
    console.info('Shopee.fetch', { status: 200, requestId: 'stub', ms: Math.round(t1 - t0), count: 0 });
  }, []);

  const refetch = fetchPage;

  return { itens, loading, error, total, fetchPage, refetch };
}

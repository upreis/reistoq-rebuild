import { useState } from 'react';

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
  const [state] = useState<UsePedidosReturn>({
    itens: [],
    loading: false,
    error: null,
    total: 0,
    fetchPage: async () => {},
    refetch: async () => {},
  });
  return state;
}

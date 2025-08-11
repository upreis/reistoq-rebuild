import { useEffect } from 'react';
import type { ItemPedido } from '@/hooks/useItensPedidos';
import { useItensPedidos } from '@/hooks/useItensPedidos';

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

export type ResultadoPedido = ItemPedido;

export type UsePedidosReturn = {
  itens: ResultadoPedido[];
  loading: boolean;
  error: string | null;
  total?: number;
  fetchPage: (page?: number) => Promise<void>;
  refetch: () => Promise<void>;
};

// Adapter 1:1 para reaproveitar o hook existente sem mudar comportamento
export function usePedidosTiny(_filtros: Filtros): UsePedidosReturn {
  const {
    itens,
    loading,
    error,
    buscarComFiltros,
    recarregarDados,
  } = useItensPedidos();

  useEffect(() => {
    // Mantemos o controle de filtros no hook original via página; nada a fazer aqui
  }, []);

  const fetchPage = async () => {
    await buscarComFiltros();
  };

  const refetch = async () => {
    await recarregarDados();
  };

  return { itens, loading, error, total: itens.length, fetchPage, refetch };
}

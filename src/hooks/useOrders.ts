import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { useSearchParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { orderService } from '@/services/OrderService';
import type { ListParams, ListResponse, OrderItem, OrderMetrics } from '@/types/orders';

// Função para obter últimos 7 dias (corrige datas hardcoded)
function getLastSevenDays() {
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);
  
  return {
    from: sevenDaysAgo.toISOString().split('T')[0],
    to: today.toISOString().split('T')[0]
  };
}

export function useOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Estado em URL (corrige fonte duplicada em localStorage)
  const filters: ListParams = {
    q: searchParams.get('q') || '',
    from: searchParams.get('from') || getLastSevenDays().from,
    to: searchParams.get('to') || getLastSevenDays().to,
    situacoes: searchParams.get('situacoes')?.split(',').filter(Boolean) || [],
    fonte: (searchParams.get('fonte') as any) || 'interno',
    contas: searchParams.get('contas')?.split(',').filter(Boolean) || [],
    page: Number(searchParams.get('page')) || 1,
    pageSize: 100, // Fixo conforme legado
    sort: searchParams.get('sort') || 'data_pedido',
    order: (searchParams.get('order') as 'asc' | 'desc') || 'desc'
  };

  // SWR para cache inteligente
  const { data, error, isLoading, mutate } = useSWR(
    ['orders', filters],
    ([, params]) => orderService.list(params),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30s
      errorRetryCount: 2
    }
  );

  // Métricas calculadas
  const metrics: OrderMetrics = {
    totalItens: data?.items.length || 0,
    totalPedidos: new Set(data?.items.map(item => item.numero_pedido)).size || 0,
    pedidosPendentes: data?.items.filter(item => item.situacao === 'Em Aberto').length || 0,
    pedidosAprovados: data?.items.filter(item => item.situacao === 'Aprovado').length || 0,
    pedidosEnviados: data?.items.filter(item => item.situacao === 'Enviado').length || 0,
    pedidosEntregues: data?.items.filter(item => item.situacao === 'Entregue').length || 0,
    valorTotal: data?.items.reduce((sum, item) => sum + item.valor_total, 0) || 0
  };

  // Atualizar filtros (com debounce para busca)
  const updateFilters = useCallback((newFilters: Partial<ListParams>) => {
    const current = Object.fromEntries(searchParams);
    const updated = { ...current, ...newFilters };
    
    // Converter para strings para URLSearchParams
    const stringified: Record<string, string> = {};
    Object.entries(updated).forEach(([key, value]) => {
      if (value != null && value !== '' && !(Array.isArray(value) && value.length === 0)) {
        if (Array.isArray(value)) {
          stringified[key] = value.join(',');
        } else {
          stringified[key] = String(value);
        }
      }
    });

    setSearchParams(stringified);
  }, [searchParams, setSearchParams]);

  // Debounce para busca por texto
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout>();
  const updateSearch = useCallback((q: string) => {
    if (searchDebounce) clearTimeout(searchDebounce);
    
    setSearchDebounce(setTimeout(() => {
      updateFilters({ q, page: 1 });
    }, 300));
  }, [updateFilters, searchDebounce]);

  // Limpar filtros (mantém comportamento legado)
  const clearFilters = useCallback(() => {
    const defaultDates = getLastSevenDays();
    setSearchParams({
      from: defaultDates.from,
      to: defaultDates.to,
      fonte: 'interno'
    });
  }, [setSearchParams]);

  // Recarregar dados
  const refetch = useCallback(() => {
    return mutate();
  }, [mutate]);

  // Paginação
  const goToPage = useCallback((page: number) => {
    updateFilters({ page });
  }, [updateFilters]);

  const nextPage = useCallback(() => {
    if (data && filters.page < data.totalPages) {
      goToPage(filters.page + 1);
    }
  }, [data, filters.page, goToPage]);

  const prevPage = useCallback(() => {
    if (filters.page > 1) {
      goToPage(filters.page - 1);
    }
  }, [filters.page, goToPage]);

  // Tratamento de erro
  useEffect(() => {
    if (error) {
      console.error('Erro ao carregar pedidos:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao carregar pedidos',
        variant: 'destructive'
      });
    }
  }, [error]);

  return {
    // Dados
    orders: data?.items || [],
    metrics,
    total: data?.total || 0,
    totalPages: data?.totalPages || 0,
    
    // Estado
    loading: isLoading,
    error,
    filters,
    
    // Ações
    updateFilters,
    updateSearch,
    clearFilters,
    refetch,
    
    // Paginação
    currentPage: filters.page,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: data ? filters.page < data.totalPages : false,
    hasPrevPage: filters.page > 1
  };
}
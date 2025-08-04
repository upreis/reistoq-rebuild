import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Produto {
  id: string;
  sku_interno: string;
  nome: string;
  categoria: string | null;
  descricao: string | null;
  quantidade_atual: number;
  estoque_minimo: number;
  estoque_maximo: number;
  preco_custo: number | null;
  preco_venda: number | null;
  codigo_barras: string | null;
  localizacao: string | null;
  status: string;
  ativo: boolean;
  url_imagem: string | null;
  ultima_movimentacao: string | null;
  created_at: string;
  updated_at: string;
}

export interface EstoqueMetricas {
  totalProdutos: number;
  produtosAlerta: number;
  valorTotalEstoque: number;
}

export interface FiltrosEstoque {
  busca: string;
  categoria: string;
  status: string;
}

export function useEstoque() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [metricas, setMetricas] = useState<EstoqueMetricas>({
    totalProdutos: 0,
    produtosAlerta: 0,
    valorTotalEstoque: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosEstoque>({
    busca: '',
    categoria: '',
    status: ''
  });
  const { toast } = useToast();
  
  // Refs para controle de execução
  const isLoadingRef = useRef(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  const calcularStatusProduto = useCallback((produto: Produto): string => {
    if (!produto.ativo) {
      return 'inativo';
    } else if (produto.quantidade_atual === 0) {
      return 'critico';
    } else if (produto.quantidade_atual <= produto.estoque_minimo) {
      return 'baixo';
    } else if (produto.quantidade_atual > produto.estoque_maximo) {
      return 'alto';
    } else {
      return 'ativo';
    }
  }, []);

  const calcularMetricas = useCallback((produtosList: Produto[]) => {
    if (!mountedRef.current) return;
    
    const totalProdutos = produtosList.length;
    
    const produtosAlerta = produtosList.filter(
      produto => produto.quantidade_atual <= produto.estoque_minimo
    ).length;

    const valorTotalEstoque = produtosList.reduce((total, produto) => {
      const preco = produto.preco_custo || 0;
      return total + (preco * produto.quantidade_atual);
    }, 0);

    setMetricas({
      totalProdutos,
      produtosAlerta,
      valorTotalEstoque
    });
  }, []);

  const buscarProdutos = useCallback(async (forceReload = false) => {
    // Evitar múltiplas chamadas simultâneas
    if (isLoadingRef.current && !forceReload) {
      return;
    }

    try {
      isLoadingRef.current = true;
      setError(null);
      
      // Só mostrar loading se for a primeira vez ou forceReload
      if (produtos.length === 0 || forceReload) {
        setLoading(true);
      }

      let query = supabase
        .from('produtos')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filtros.busca) {
        query = query.or(`nome.ilike.%${filtros.busca}%,sku_interno.ilike.%${filtros.busca}%`);
      }

      if (filtros.categoria) {
        query = query.eq('categoria', filtros.categoria);
      }

      if (filtros.status && filtros.status === 'inativo') {
        query = query.eq('ativo', false);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Aplicar filtro de status calculado
      let produtosFiltrados = data || [];
      if (filtros.status && filtros.status !== 'inativo') {
        produtosFiltrados = produtosFiltrados.filter(produto => {
          const statusCalculado = calcularStatusProduto(produto);
          return statusCalculado === filtros.status;
        });
      }

      if (!mountedRef.current) return;

      setProdutos(produtosFiltrados);
      calcularMetricas(produtosFiltrados);
    } catch (err: any) {
      console.error('Erro ao buscar produtos:', err);
      if (!mountedRef.current) return;
      
      setError(err.message);
      toast({
        title: "Erro ao carregar produtos",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      isLoadingRef.current = false;
    }
  }, [filtros, toast, calcularStatusProduto, calcularMetricas, produtos.length]);

  const atualizarFiltros = useCallback((novosFiltros: Partial<FiltrosEstoque>) => {
    setFiltros(prev => ({ ...prev, ...novosFiltros }));
  }, []);

  const limparFiltros = useCallback(() => {
    setFiltros({
      busca: '',
      categoria: '',
      status: ''
    });
  }, []);

  const recarregarDados = useCallback(() => {
    buscarProdutos(true);
  }, [buscarProdutos]);

  // Carregamento inicial - apenas uma vez
  useEffect(() => {
    mountedRef.current = true;
    buscarProdutos(true);

    return () => {
      mountedRef.current = false;
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []); // Dependência vazia - só executa na montagem

  // Debounce para filtros - executa quando filtros mudam
  useEffect(() => {
    if (!mountedRef.current) return;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        buscarProdutos();
      }
    }, 300);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [filtros.busca, filtros.categoria, filtros.status]); // Dependências específicas

  // Setup realtime updates - apenas uma vez
  useEffect(() => {
    let throttleTimeout: NodeJS.Timeout;
    
    const channel = supabase
      .channel('produtos-realtime-estoque')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'produtos'
        },
        () => {
          console.log('Produto atualizado via realtime...');
          
          // Throttle para evitar updates muito frequentes
          if (throttleTimeout) {
            clearTimeout(throttleTimeout);
          }
          
          throttleTimeout = setTimeout(() => {
            if (mountedRef.current && !isLoadingRef.current) {
              buscarProdutos();
            }
          }, 1500); // 1.5 segundos de throttle
        }
      )
      .subscribe();

    return () => {
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
      supabase.removeChannel(channel);
    };
  }, []); // Dependência vazia - configurar apenas uma vez

  return {
    produtos,
    metricas,
    loading,
    error,
    filtros,
    atualizarFiltros,
    limparFiltros,
    recarregarDados
  };
}
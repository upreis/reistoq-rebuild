import { useState, useEffect } from 'react';
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

  const buscarProdutos = async () => {
    try {
      setLoading(true);
      setError(null);

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

      if (filtros.status) {
        // Aplicar filtro baseado no status calculado, não no campo status da tabela
        if (filtros.status === 'inativo') {
          query = query.eq('ativo', false);
        } else {
          query = query.eq('ativo', true);
          
          // Para os outros status, vamos filtrar no frontend já que dependem de cálculo
          // O filtro será aplicado após buscar os dados
        }
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

      setProdutos(produtosFiltrados);
      calcularMetricas(produtosFiltrados);
    } catch (err: any) {
      console.error('Erro ao buscar produtos:', err);
      setError(err.message);
      toast({
        title: "Erro ao carregar produtos",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calcularStatusProduto = (produto: Produto): string => {
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
  };

  const calcularMetricas = (produtosList: Produto[]) => {
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
  };

  const atualizarFiltros = (novosFiltros: Partial<FiltrosEstoque>) => {
    setFiltros(prev => ({ ...prev, ...novosFiltros }));
  };

  const limparFiltros = () => {
    setFiltros({
      busca: '',
      categoria: '',
      status: ''
    });
  };

  const recarregarDados = () => {
    buscarProdutos();
  };

  // Buscar produtos quando componente monta ou filtros mudam
  useEffect(() => {
    buscarProdutos();
  }, [filtros]);

  // Setup realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('produtos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'produtos'
        },
        () => {
          console.log('Produto atualizado, recarregando dados...');
          buscarProdutos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
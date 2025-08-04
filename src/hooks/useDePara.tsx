import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MapeamentoDePara {
  id: string;
  sku_pedido: string;
  sku_correspondente: string;
  sku_simples: string | null;
  quantidade: number;
  ativo: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeParaMetricas {
  totalMapeamentos: number;
  mapeamentosAtivos: number;
  mapeamentosInativos: number;
}

export interface FiltrosDePara {
  busca: string;
  preenchimento: 'todos' | 'pendentes' | 'preenchidos';
}

export function useDePara() {
  const [mapeamentos, setMapeamentos] = useState<MapeamentoDePara[]>([]);
  const [metricas, setMetricas] = useState<DeParaMetricas>({
    totalMapeamentos: 0,
    mapeamentosAtivos: 0,
    mapeamentosInativos: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosDePara>({
    busca: '',
    preenchimento: 'todos'
  });
  const { toast } = useToast();

  const buscarMapeamentos = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('mapeamentos_depara')
        .select('*')
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filtros.busca) {
        query = query.or(
          `sku_pedido.ilike.%${filtros.busca}%,sku_correspondente.ilike.%${filtros.busca}%,sku_simples.ilike.%${filtros.busca}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      let mapeamentosFiltrados = data || [];

      // Aplicar filtro de preenchimento no lado do cliente
      if (filtros.preenchimento !== 'todos') {
        mapeamentosFiltrados = mapeamentosFiltrados.filter(mapeamento => {
          const temSkuPedido = !!mapeamento.sku_pedido;
          const temSkuCorrespondente = !!mapeamento.sku_correspondente;
          
          if (filtros.preenchimento === 'pendentes') {
            return temSkuPedido && !temSkuCorrespondente;
          } else if (filtros.preenchimento === 'preenchidos') {
            return temSkuPedido && temSkuCorrespondente;
          }
          return true;
        });
      }

      if (error) {
        throw error;
      }

      setMapeamentos(mapeamentosFiltrados);
      calcularMetricas(mapeamentosFiltrados);
    } catch (err: any) {
      console.error('Erro ao buscar mapeamentos:', err);
      setError(err.message);
      toast({
        title: "Erro ao carregar mapeamentos",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calcularMetricas = (mapeamentosList: MapeamentoDePara[]) => {
    const totalMapeamentos = mapeamentosList.length;
    const mapeamentosAtivos = mapeamentosList.filter(m => m.ativo).length;
    const mapeamentosInativos = mapeamentosList.filter(m => !m.ativo).length;

    setMetricas({
      totalMapeamentos,
      mapeamentosAtivos,
      mapeamentosInativos
    });
  };

  const atualizarFiltros = (novosFiltros: Partial<FiltrosDePara>) => {
    setFiltros(prev => ({ ...prev, ...novosFiltros }));
  };

  const limparFiltros = () => {
    setFiltros({
      busca: '',
      preenchimento: 'todos'
    });
  };

  const recarregarDados = () => {
    buscarMapeamentos();
  };

  const excluirMapeamento = async (id: string) => {
    try {
      const { error } = await supabase
        .from('mapeamentos_depara')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Mapeamento excluído",
        description: "O mapeamento foi excluído com sucesso.",
      });

      await buscarMapeamentos();
    } catch (err: any) {
      toast({
        title: "Erro ao excluir mapeamento",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const excluirMapeamentosSelecionados = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('mapeamentos_depara')
        .delete()
        .in('id', ids);

      if (error) throw error;

      toast({
        title: "Mapeamentos excluídos",
        description: `${ids.length} mapeamento(s) foram excluídos com sucesso.`,
      });

      await buscarMapeamentos();
    } catch (err: any) {
      toast({
        title: "Erro ao excluir mapeamentos",
        description: err.message,
        variant: "destructive",
      });
    }
  };


  // Buscar mapeamentos quando componente monta ou filtros mudam
  useEffect(() => {
    buscarMapeamentos();
  }, [filtros]);

  // Setup realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('mapeamentos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mapeamentos_depara'
        },
        () => {
          console.log('Mapeamento atualizado, recarregando dados...');
          buscarMapeamentos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    mapeamentos,
    metricas,
    loading,
    error,
    filtros,
    atualizarFiltros,
    limparFiltros,
    recarregarDados,
    excluirMapeamento,
    excluirMapeamentosSelecionados
  };
}
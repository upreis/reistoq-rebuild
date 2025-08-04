import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MovimentacaoHistorico {
  id: string;
  produto_id: string;
  tipo_movimentacao: string;
  quantidade_anterior: number;
  quantidade_nova: number;
  quantidade_movimentada: number;
  motivo: string | null;
  observacoes: string | null;
  created_at: string;
  produto?: {
    nome: string;
    sku_interno: string;
    codigo_barras: string | null;
  };
}

interface HistoricoMetricas {
  total_movimentacoes: number;
  entradas_hoje: number;
  saidas_hoje: number;
  valor_movimentado: number;
}

interface FiltrosHistorico {
  termo_busca: string;
  tipo_movimentacao: string;
  data_inicio: string;
  data_fim: string;
  produto_id: string;
}

export function useHistoricoMovimentacoes() {
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoHistorico[]>([]);
  const [metricas, setMetricas] = useState<HistoricoMetricas>({
    total_movimentacoes: 0,
    entradas_hoje: 0,
    saidas_hoje: 0,
    valor_movimentado: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosHistorico>({
    termo_busca: '',
    tipo_movimentacao: '',
    data_inicio: '',
    data_fim: '',
    produto_id: '',
  });

  const { toast } = useToast();

  const buscarMovimentacoes = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('movimentacoes_estoque')
        .select(`
          *,
          produto:produtos!inner(
            nome,
            sku_interno,
            codigo_barras
          )
        `)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filtros.termo_busca) {
        query = query.or(`motivo.ilike.%${filtros.termo_busca}%,observacoes.ilike.%${filtros.termo_busca}%,produto.nome.ilike.%${filtros.termo_busca}%,produto.sku_interno.ilike.%${filtros.termo_busca}%`);
      }

      if (filtros.tipo_movimentacao) {
        query = query.eq('tipo_movimentacao', filtros.tipo_movimentacao);
      }

      if (filtros.data_inicio) {
        query = query.gte('created_at', `${filtros.data_inicio}T00:00:00`);
      }

      if (filtros.data_fim) {
        query = query.lte('created_at', `${filtros.data_fim}T23:59:59`);
      }

      if (filtros.produto_id) {
        query = query.eq('produto_id', filtros.produto_id);
      }

      const { data, error } = await query.limit(1000);

      if (error) {
        throw error;
      }

      setMovimentacoes(data || []);
      calcularMetricas(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar movimentações:', error);
      setError(error.message);
      toast({
        title: "Erro ao carregar histórico",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calcularMetricas = (movimentacoesList: MovimentacaoHistorico[]) => {
    const hoje = new Date().toISOString().split('T')[0];
    
    const movimentacoesHoje = movimentacoesList.filter(mov => 
      mov.created_at.split('T')[0] === hoje
    );

    const entradas = movimentacoesHoje.filter(mov => mov.tipo_movimentacao === 'entrada');
    const saidas = movimentacoesHoje.filter(mov => mov.tipo_movimentacao === 'saida');

    setMetricas({
      total_movimentacoes: movimentacoesList.length,
      entradas_hoje: entradas.length,
      saidas_hoje: saidas.length,
      valor_movimentado: movimentacoesList.reduce((acc, mov) => acc + mov.quantidade_movimentada, 0),
    });
  };

  const atualizarFiltros = (novosFiltros: Partial<FiltrosHistorico>) => {
    setFiltros(prev => ({ ...prev, ...novosFiltros }));
  };

  const limparFiltros = () => {
    setFiltros({
      termo_busca: '',
      tipo_movimentacao: '',
      data_inicio: '',
      data_fim: '',
      produto_id: '',
    });
  };

  const excluirMovimentacao = async (id: string) => {
    try {
      const { error } = await supabase
        .from('movimentacoes_estoque')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Movimentação excluída",
        description: "A movimentação foi excluída com sucesso.",
      });

      buscarMovimentacoes();
    } catch (error: any) {
      console.error('Erro ao excluir movimentação:', error);
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const excluirMovimentacoesSelecionadas = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('movimentacoes_estoque')
        .delete()
        .in('id', ids);

      if (error) throw error;

      toast({
        title: "Movimentações excluídas",
        description: `${ids.length} movimentação(ões) foram excluídas com sucesso.`,
      });

      buscarMovimentacoes();
    } catch (error: any) {
      console.error('Erro ao excluir movimentações:', error);
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const recarregarDados = () => {
    buscarMovimentacoes();
  };

  useEffect(() => {
    buscarMovimentacoes();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      buscarMovimentacoes();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filtros]);

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('movimentacoes_estoque_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'movimentacoes_estoque' },
        () => {
          buscarMovimentacoes();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return {
    movimentacoes,
    metricas,
    loading,
    error,
    filtros,
    atualizarFiltros,
    limparFiltros,
    recarregarDados,
    excluirMovimentacao,
    excluirMovimentacoesSelecionadas,
  };
}
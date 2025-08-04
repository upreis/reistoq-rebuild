import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HistoricoVenda {
  id: string;
  id_unico: string;
  numero_pedido: string;
  sku_produto: string;
  nome_produto: string | null;
  quantidade_vendida: number;
  valor_unitario: number;
  valor_total: number;
  cliente_nome: string | null;
  cliente_documento: string | null;
  status: string;
  observacoes: string | null;
  data_venda: string;
  created_at: string;
  updated_at: string;
}

interface HistoricoVendasMetricas {
  total_vendas: number;
  receita_total: number;
  receita_hoje: number;
  vendas_concluidas: number;
  ticket_medio: number;
}

interface FiltrosHistoricoVendas {
  termo_busca: string;
  status: string;
  data_inicio: string;
  data_fim: string;
  cliente: string;
}

export function useHistoricoVendas() {
  const [vendas, setVendas] = useState<HistoricoVenda[]>([]);
  const [metricas, setMetricas] = useState<HistoricoVendasMetricas>({
    total_vendas: 0,
    receita_total: 0,
    receita_hoje: 0,
    vendas_concluidas: 0,
    ticket_medio: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosHistoricoVendas>({
    termo_busca: '',
    status: '',
    data_inicio: '',
    data_fim: '',
    cliente: '',
  });

  const { toast } = useToast();

  const buscarVendas = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('historico_vendas')
        .select('*')
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filtros.termo_busca) {
        query = query.or(`numero_pedido.ilike.%${filtros.termo_busca}%,sku_produto.ilike.%${filtros.termo_busca}%,nome_produto.ilike.%${filtros.termo_busca}%,observacoes.ilike.%${filtros.termo_busca}%`);
      }

      if (filtros.status) {
        query = query.eq('status', filtros.status);
      }

      if (filtros.data_inicio) {
        query = query.gte('data_venda', filtros.data_inicio);
      }

      if (filtros.data_fim) {
        query = query.lte('data_venda', filtros.data_fim);
      }

      if (filtros.cliente) {
        query = query.or(`cliente_nome.ilike.%${filtros.cliente}%,cliente_documento.ilike.%${filtros.cliente}%`);
      }

      const { data, error } = await query.limit(1000);

      if (error) {
        throw error;
      }

      setVendas(data || []);
      calcularMetricas(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar histórico de vendas:', error);
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

  const calcularMetricas = (vendasList: HistoricoVenda[]) => {
    const hoje = new Date().toISOString().split('T')[0];
    
    const vendasHoje = vendasList.filter(venda => 
      venda.data_venda === hoje
    );

    const vendasConcluidas = vendasList.filter(venda => venda.status === 'concluida');
    const receitaTotal = vendasList.reduce((acc, venda) => acc + Number(venda.valor_total), 0);
    const receitaHoje = vendasHoje.reduce((acc, venda) => acc + Number(venda.valor_total), 0);
    const ticketMedio = vendasList.length > 0 ? receitaTotal / vendasList.length : 0;

    setMetricas({
      total_vendas: vendasList.length,
      receita_total: receitaTotal,
      receita_hoje: receitaHoje,
      vendas_concluidas: vendasConcluidas.length,
      ticket_medio: ticketMedio,
    });
  };

  const atualizarFiltros = (novosFiltros: Partial<FiltrosHistoricoVendas>) => {
    setFiltros(prev => ({ ...prev, ...novosFiltros }));
  };

  const limparFiltros = () => {
    setFiltros({
      termo_busca: '',
      status: '',
      data_inicio: '',
      data_fim: '',
      cliente: '',
    });
  };

  const excluirVenda = async (id: string) => {
    try {
      const { error } = await supabase
        .from('historico_vendas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Venda excluída",
        description: "A venda foi excluída com sucesso.",
      });

      buscarVendas();
    } catch (error: any) {
      console.error('Erro ao excluir venda:', error);
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const excluirVendasSelecionadas = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('historico_vendas')
        .delete()
        .in('id', ids);

      if (error) throw error;

      toast({
        title: "Vendas excluídas",
        description: `${ids.length} venda(s) foram excluídas com sucesso.`,
      });

      buscarVendas();
    } catch (error: any) {
      console.error('Erro ao excluir vendas:', error);
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const adicionarVenda = async (novaVenda: Omit<HistoricoVenda, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('historico_vendas')
        .insert([novaVenda]);

      if (error) throw error;

      toast({
        title: "Venda adicionada",
        description: "A venda foi adicionada com sucesso.",
      });

      buscarVendas();
    } catch (error: any) {
      console.error('Erro ao adicionar venda:', error);
      toast({
        title: "Erro ao adicionar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const atualizarVenda = async (id: string, dadosAtualizados: Partial<HistoricoVenda>) => {
    try {
      const { error } = await supabase
        .from('historico_vendas')
        .update(dadosAtualizados)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Venda atualizada",
        description: "A venda foi atualizada com sucesso.",
      });

      buscarVendas();
    } catch (error: any) {
      console.error('Erro ao atualizar venda:', error);
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const recarregarDados = () => {
    buscarVendas();
  };

  useEffect(() => {
    buscarVendas();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      buscarVendas();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filtros]);

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('historico_vendas_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'historico_vendas' },
        () => {
          buscarVendas();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return {
    vendas,
    metricas,
    loading,
    error,
    filtros,
    atualizarFiltros,
    limparFiltros,
    recarregarDados,
    excluirVenda,
    excluirVendasSelecionadas,
    adicionarVenda,
    atualizarVenda,
  };
}
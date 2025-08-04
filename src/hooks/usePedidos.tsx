import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Pedido {
  id: string;
  numero: string;
  numero_ecommerce?: string;
  nome_cliente: string;
  cpf_cnpj?: string;
  data_pedido: string;
  data_prevista?: string;
  valor_total: number;
  valor_frete: number;
  valor_desconto: number;
  situacao: string;
  obs?: string;
  obs_interna?: string;
  codigo_rastreamento?: string;
  url_rastreamento?: string;
  created_at: string;
  updated_at: string;
}

interface PedidosMetricas {
  totalPedidos: number;
  pedidosPendentes: number;
  pedidosProcessados: number;
  valorTotal: number;
}

interface FiltrosPedidos {
  busca: string;
  cliente: string;
  dataInicio: string;
  dataFim: string;
  situacao: string;
}

export function usePedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [metricas, setMetricas] = useState<PedidosMetricas>({
    totalPedidos: 0,
    pedidosPendentes: 0,
    pedidosProcessados: 0,
    valorTotal: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosPedidos>({
    busca: '',
    cliente: '',
    dataInicio: '',
    dataFim: '',
    situacao: ''
  });

  const buscarPedidos = async () => {
    try {
      setLoading(true);
      setError(null);

      // Primeiro, tentar sincronizar com o Tiny ERP
      console.log('Sincronizando pedidos com Tiny ERP...');
      
      const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-pedidos-rapido', {
        body: {
          filtros: {
            dataInicio: filtros.dataInicio,
            dataFim: filtros.dataFim,
            situacao: filtros.situacao
          }
        }
      });

      if (syncError) {
        console.warn('Erro na sincronização com Tiny ERP:', syncError);
        toast({
          title: "Aviso",
          description: "Erro na sincronização com Tiny ERP. Mostrando dados locais.",
          variant: "destructive",
        });
      } else {
        console.log('Sincronização concluída:', syncData?.message);
      }

      // Buscar dados atualizados do banco local
      let query = supabase
        .from('pedidos')
        .select('*');

      // Aplicar filtros locais
      if (filtros.busca) {
        query = query.or(`numero.ilike.%${filtros.busca}%,numero_ecommerce.ilike.%${filtros.busca}%`);
      }

      if (filtros.cliente) {
        query = query.ilike('nome_cliente', `%${filtros.cliente}%`);
      }

      if (filtros.dataInicio) {
        query = query.gte('data_pedido', filtros.dataInicio);
      }

      if (filtros.dataFim) {
        query = query.lte('data_pedido', filtros.dataFim);
      }

      if (filtros.situacao && filtros.situacao !== 'todas') {
        query = query.eq('situacao', filtros.situacao);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setPedidos(data || []);
      calcularMetricas(data || []);
      
      // Toast de sucesso apenas se houve sincronização
      if (!syncError && syncData) {
        toast({
          title: "Sincronização concluída",
          description: syncData.message || "Pedidos atualizados com sucesso",
        });
      }
    } catch (err) {
      console.error('Erro ao buscar pedidos:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      toast({
        title: "Erro",
        description: "Erro ao carregar pedidos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calcularMetricas = (pedidosList: Pedido[]) => {
    const totalPedidos = pedidosList.length;
    const pedidosPendentes = pedidosList.filter(p => p.situacao === 'pendente').length;
    const pedidosProcessados = pedidosList.filter(p => p.situacao === 'processado').length;
    const valorTotal = pedidosList.reduce((sum, p) => sum + (p.valor_total || 0), 0);

    setMetricas({
      totalPedidos,
      pedidosPendentes,
      pedidosProcessados,
      valorTotal
    });
  };

  const atualizarFiltros = (novosFiltros: Partial<FiltrosPedidos>) => {
    setFiltros(prev => ({ ...prev, ...novosFiltros }));
  };

  const limparFiltros = () => {
    setFiltros({
      busca: '',
      cliente: '',
      dataInicio: '',
      dataFim: '',
      situacao: ''
    });
  };

  const recarregarDados = () => {
    buscarPedidos();
  };

  const obterDetalhesPedido = async (numeroPedido: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('obter-pedido-tiny', {
        body: { numeroPedido }
      });

      if (error) {
        throw error;
      }

      return data.pedido;
    } catch (err) {
      console.error('Erro ao obter detalhes do pedido:', err);
      toast({
        title: "Erro",
        description: "Erro ao obter detalhes do pedido. Tente novamente.",
        variant: "destructive",
      });
      throw err;
    }
  };

  useEffect(() => {
    buscarPedidos();
  }, [filtros]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('pedidos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pedidos'
        },
        () => {
          buscarPedidos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    pedidos,
    metricas,
    loading,
    error,
    filtros,
    atualizarFiltros,
    limparFiltros,
    recarregarDados,
    obterDetalhesPedido
  };
}
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Interface para item de pedido (cada linha da tabela)
export interface ItemPedido {
  id: string;
  pedido_id: string;
  numero_pedido: string;
  sku: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  ncm?: string;
  codigo_barras?: string;
  observacoes?: string;
  // Dados do pedido (joined)
  numero_ecommerce?: string;
  nome_cliente: string;
  cpf_cnpj?: string;
  data_pedido: string;
  data_prevista?: string;
  situacao: string;
  codigo_rastreamento?: string;
  url_rastreamento?: string;
  obs?: string;
  obs_interna?: string;
  valor_frete: number;
  valor_desconto: number;
  created_at?: string;
  updated_at?: string;
  // Dados do mapeamento DE/PARA (aplicado na exibição)
  sku_correspondente?: string;
  sku_simples?: string;
  produto_nome?: string;
  produto_categoria?: string;
  estoque_atual?: number;
}

interface MetricasPedidos {
  totalItens: number;
  totalPedidos: number;
  pedidosPendentes: number;
  pedidosAprovados: number;
  pedidosEnviados: number;
  pedidosEntregues: number;
  valorTotal: number;
}

interface FiltrosPedidos {
  busca: string;
  dataInicio: string;
  dataFim: string;
  situacoes: string[];
}

export function useItensPedidos() {
  const [itens, setItens] = useState<ItemPedido[]>([]);
  const [metricas, setMetricas] = useState<MetricasPedidos>({
    totalItens: 0,
    totalPedidos: 0,
    pedidosPendentes: 0,
    pedidosAprovados: 0,
    pedidosEnviados: 0,
    pedidosEntregues: 0,
    valorTotal: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosPedidos>(() => {
    // ✅ Inicialização automática das datas (últimos 30 dias, não incluindo hoje)
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1); // Ontem (não hoje)
    
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30); // 30 dias atrás
    
    return {
      busca: '',
      dataInicio: trintaDiasAtras.toISOString().split('T')[0], // YYYY-MM-DD
      dataFim: ontem.toISOString().split('T')[0],              // YYYY-MM-DD (ontem)
      situacoes: []
    };
  });

  // Carregar filtros salvos do localStorage (se existirem)
  useEffect(() => {
    const filtrosSalvos = localStorage.getItem('filtros-pedidos');
    if (filtrosSalvos) {
      try {
        const filtrosCarregados = JSON.parse(filtrosSalvos);
        // Se não tem datas salvas, mantém as datas inicializadas automaticamente
        if (!filtrosCarregados.dataInicio || !filtrosCarregados.dataFim) {
          const ontem = new Date();
          ontem.setDate(ontem.getDate() - 1); // Ontem (não hoje)
          
          const trintaDiasAtras = new Date();
          trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30); // 30 dias atrás
          
          filtrosCarregados.dataInicio = filtrosCarregados.dataInicio || trintaDiasAtras.toISOString().split('T')[0];
          filtrosCarregados.dataFim = filtrosCarregados.dataFim || ontem.toISOString().split('T')[0];
        }
        setFiltros(filtrosCarregados);
      } catch (error) {
        console.warn('Erro ao carregar filtros salvos:', error);
      }
    }
  }, []);

  // Salvar filtros no localStorage sempre que mudarem
  useEffect(() => {
    localStorage.setItem('filtros-pedidos', JSON.stringify(filtros));
  }, [filtros]);

  const buscarItens = async () => {
    try {
      setLoading(true);
      setError(null);

      // Primeiro, sincronizar com o Tiny ERP se necessário
      console.log('Sincronizando pedidos com Tiny ERP...');
      
      const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-pedidos-tiny', {
        body: {
          filtros: {
            dataInicio: filtros.dataInicio,
            dataFim: filtros.dataFim,
            situacao: filtros.situacoes.length === 1 ? filtros.situacoes[0] : ''
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

      // Buscar itens com dados do pedido (JOIN)
      let query = supabase
        .from('itens_pedidos')
        .select(`
          *,
          pedidos!inner(
            numero_ecommerce,
            nome_cliente,
            cpf_cnpj,
            data_pedido,
            data_prevista,
            situacao,
            codigo_rastreamento,
            url_rastreamento,
            obs,
            obs_interna,
            valor_frete,
            valor_desconto
          )
        `);

      // Aplicar filtros
      if (filtros.busca) {
        query = query.or(`numero_pedido.ilike.%${filtros.busca}%,pedidos.nome_cliente.ilike.%${filtros.busca}%,sku.ilike.%${filtros.busca}%,descricao.ilike.%${filtros.busca}%`);
      }

      if (filtros.dataInicio) {
        query = query.filter('pedidos.data_pedido', 'gte', filtros.dataInicio);
      }

      if (filtros.dataFim) {
        query = query.filter('pedidos.data_pedido', 'lte', filtros.dataFim);
      }

      if (filtros.situacoes.length > 0) {
        query = query.filter('pedidos.situacao', 'in', `(${filtros.situacoes.join(',')})`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Processar dados e aplicar mapeamento DE/PARA
      const itensProcessados = await aplicarMapeamentos(data || []);
      
      setItens(itensProcessados);
      calcularMetricas(itensProcessados);
      
      // Toast de sucesso apenas se houve sincronização
      if (!syncError && syncData) {
        toast({
          title: "Sincronização concluída",
          description: syncData.message || "Pedidos atualizados com sucesso",
        });
      }
    } catch (err) {
      console.error('Erro ao buscar itens de pedidos:', err);
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

  const aplicarMapeamentos = async (itensRaw: any[]): Promise<ItemPedido[]> => {
    try {
      // Buscar todos os mapeamentos DE/PARA
      const { data: mapeamentos } = await supabase
        .from('mapeamentos_depara')
        .select('*')
        .eq('ativo', true);

      // Buscar produtos para enriquecer com informações do estoque
      const { data: produtos } = await supabase
        .from('produtos')
        .select('sku_interno, nome, categoria, quantidade_atual');

      return itensRaw.map(item => {
        const pedidoData = item.pedidos;
        
        // Aplicar mapeamento DE/PARA
        const mapeamento = mapeamentos?.find(m => m.sku_pedido === item.sku);
        const skuCorrespondente = mapeamento?.sku_correspondente || item.sku;
        const skuSimples = mapeamento?.sku_simples;
        
        // Buscar dados do produto no estoque
        const produto = produtos?.find(p => p.sku_interno === skuCorrespondente);

        return {
          id: item.id,
          pedido_id: item.pedido_id,
          numero_pedido: item.numero_pedido,
          sku: item.sku,
          descricao: item.descricao,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          valor_total: item.valor_total,
          ncm: item.ncm,
          codigo_barras: item.codigo_barras,
          observacoes: item.observacoes,
          // Dados do pedido
          numero_ecommerce: pedidoData.numero_ecommerce,
          nome_cliente: pedidoData.nome_cliente,
          cpf_cnpj: pedidoData.cpf_cnpj,
          data_pedido: pedidoData.data_pedido,
          data_prevista: pedidoData.data_prevista,
          situacao: pedidoData.situacao,
          codigo_rastreamento: pedidoData.codigo_rastreamento,
          url_rastreamento: pedidoData.url_rastreamento,
          obs: pedidoData.obs,
          obs_interna: pedidoData.obs_interna,
          valor_frete: pedidoData.valor_frete,
          valor_desconto: pedidoData.valor_desconto,
          created_at: item.created_at,
          updated_at: item.updated_at,
          // Dados do mapeamento e produto
          sku_correspondente: skuCorrespondente !== item.sku ? skuCorrespondente : undefined,
          sku_simples: skuSimples,
          produto_nome: produto?.nome,
          produto_categoria: produto?.categoria,
          estoque_atual: produto?.quantidade_atual
        };
      });
    } catch (error) {
      console.error('Erro ao aplicar mapeamentos:', error);
      // Em caso de erro, retorna os dados básicos sem mapeamento
      return itensRaw.map(item => ({
        ...item,
        ...item.pedidos,
        pedidos: undefined
      }));
    }
  };

  const calcularMetricas = (itensList: ItemPedido[]) => {
    const pedidosUnicos = new Set(itensList.map(item => item.numero_pedido));
    const totalPedidos = pedidosUnicos.size;
    const totalItens = itensList.length;
    
    const situacoesPendentes = ['em aberto', 'aprovado', 'preparando envio'];
    const situacoesEnviadas = ['enviado', 'entregue'];
    
    const pedidosPendentes = new Set(
      itensList
        .filter(item => situacoesPendentes.includes(item.situacao.toLowerCase()))
        .map(item => item.numero_pedido)
    ).size;
    
    const pedidosAprovados = new Set(
      itensList
        .filter(item => item.situacao.toLowerCase() === 'aprovado')
        .map(item => item.numero_pedido)
    ).size;
    
    const pedidosEnviados = new Set(
      itensList
        .filter(item => situacoesEnviadas.includes(item.situacao.toLowerCase()))
        .map(item => item.numero_pedido)
    ).size;
    
    const pedidosEntregues = new Set(
      itensList
        .filter(item => item.situacao.toLowerCase() === 'entregue')
        .map(item => item.numero_pedido)
    ).size;
    
    const valorTotal = itensList.reduce((sum, item) => sum + (item.valor_total || 0), 0);

    setMetricas({
      totalItens,
      totalPedidos,
      pedidosPendentes,
      pedidosAprovados,
      pedidosEnviados,
      pedidosEntregues,
      valorTotal
    });
  };

  const atualizarFiltros = (novosFiltros: Partial<FiltrosPedidos>) => {
    setFiltros(prev => ({ ...prev, ...novosFiltros }));
  };

  const limparFiltros = () => {
    setFiltros({
      busca: '',
      dataInicio: '',
      dataFim: '',
      situacoes: []
    });
  };

  const recarregarDados = () => {
    buscarItens();
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

  // Carregamento inicial apenas - sem recarregar automaticamente nos filtros
  useEffect(() => {
    buscarItens();
  }, []); // Remove a dependência dos filtros

  // Real-time subscription para itens_pedidos
  useEffect(() => {
    const channel = supabase
      .channel('itens-pedidos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'itens_pedidos'
        },
        () => {
          buscarItens();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pedidos'
        },
        () => {
          buscarItens();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    itens,
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
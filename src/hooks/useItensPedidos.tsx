import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useDeParaIntegration, ItemPedidoEnriquecido } from '@/hooks/useDeParaIntegration';

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
  empresa?: string;
  numero_venda?: string;
  // Dados do pedido (joined)
  numero_ecommerce?: string;
  nome_cliente: string;
  cpf_cnpj?: string;
  cidade?: string;
  uf?: string;
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
  // ✅ NOVAS COLUNAS SOLICITADAS
  canal_venda?: string;
  nome_ecommerce?: string;
  // ✅ CAMPOS PARA BAIXA DE ESTOQUE
  sku_kit?: string;
  qtd_kit?: number;
  // Dados enriquecidos do pedido
  valor_total_pedido?: number;
  valor_frete_pedido?: number;
  valor_desconto_pedido?: number;
  obs_pedido?: string;
  obs_interna_pedido?: string;
  // Dados do mapeamento DE/PARA (aplicado na exibição)
  sku_correspondente?: string;
  sku_simples?: string;
  produto_nome?: string;
  produto_categoria?: string;
  estoque_atual?: number;
  ja_processado?: boolean;
  // Integração de origem (para RLS do histórico)
  integration_account_id?: string;
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
  dataFinal: string;  // Corrigido de dataFim para dataFinal
  situacoes: string[];
}

export function useItensPedidos() {
  // ✅ Carregar dados salvos do localStorage
  const [itens, setItens] = useState<ItemPedido[]>(() => {
    const dadosSalvos = localStorage.getItem('pedidos-dados-cache');
    if (dadosSalvos) {
      try {
        return JSON.parse(dadosSalvos);
      } catch (error) {
        return [];
      }
    }
    return [];
  });
  
  const [metricas, setMetricas] = useState<MetricasPedidos>(() => {
    const metricasSalvas = localStorage.getItem('pedidos-metricas-cache');
    if (metricasSalvas) {
      try {
        return JSON.parse(metricasSalvas);
      } catch (error) {
        return {
          totalItens: 0,
          totalPedidos: 0,
          pedidosPendentes: 0,
          pedidosAprovados: 0,
          pedidosEnviados: 0,
          pedidosEntregues: 0,
          valorTotal: 0
        };
      }
    }
    return {
      totalItens: 0,
      totalPedidos: 0,
      pedidosPendentes: 0,
      pedidosAprovados: 0,
      pedidosEnviados: 0,
      pedidosEntregues: 0,
      valorTotal: 0
    };
  });
  
  const [loading, setLoading] = useState(false); // ✅ Inicia como false - loading só quando busca for solicitada
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [filtros, setFiltros] = useState<FiltrosPedidos>(() => {
    // ✅ Carregar filtros salvos do localStorage
    const filtrosSalvos = localStorage.getItem('filtros-pedidos');
    if (filtrosSalvos) {
      try {
        return JSON.parse(filtrosSalvos);
      } catch (error) {
        // Ignorar erro ao carregar filtros
      }
    }
    // ✅ CORRIGIDO: Usar 2024 (onde estão os dados reais) - hoje é 05/08/2025
    return {
      busca: '',
      dataInicio: '07/07/2024',  // Formato DD/MM/AAAA para Tiny ERP  
      dataFinal: '11/07/2024',   // Formato DD/MM/AAAA para Tiny ERP
      situacoes: ['cancelado', 'Entregue']  // Situações que existem no Tiny ERP
    };
  });

  // ✅ DESABILITADO: Não carregar filtros salvos para usar filtros corretos
  // useEffect(() => {
  //   const filtrosSalvos = localStorage.getItem('filtros-pedidos');
  //   if (filtrosSalvos) {
  //     try {
  //       const filtrosCarregados = JSON.parse(filtrosSalvos);
  //       setFiltros(filtrosCarregados);
  //     } catch (error) {
  //       console.warn('Erro ao carregar filtros salvos:', error);
  //     }
  //   }
  // }, []);

  // Salvar filtros no localStorage sempre que mudarem
  useEffect(() => {
    localStorage.setItem('filtros-pedidos', JSON.stringify(filtros));
  }, [filtros]);

  const buscarItens = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Verificar dados locais primeiro para evitar condição de corrida
      const dadosLocais = await buscarDadosLocais();
      const temDadosLocais = dadosLocais && dadosLocais.length > 0;
      
      // Se há dados locais, usá-los imediatamente e sincronizar em background
      if (temDadosLocais) {
        // Aplicar mapeamentos aos dados locais
        const itensProcessadosLocais = await aplicarMapeamentos(dadosLocais);
        
        // Aplicar filtros nos dados locais
        const itensFiltradosLocais = aplicarFiltrosLocais(itensProcessadosLocais);
        
        // Exibir dados locais imediatamente
        setItens(itensFiltradosLocais);
        calcularMetricas(itensFiltradosLocais);
        setLoading(false);
        
        // Sincronizar em background (sem bloquear a UI)
        sincronizarEmBackground();
        return;
      }
      
      // Se não há dados locais, tentar edge function com fallback robusto
      await sincronizarComFallback();
      
    } catch (error) {
      console.error('❌ Erro na busca de itens:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Nova função para aplicar filtros locais
  const aplicarFiltrosLocais = (itensList: any[]) => {
    let itensFiltrados = itensList;

    if (filtros.busca) {
      itensFiltrados = itensFiltrados.filter((item: any) => 
        item.numero_pedido?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
        item.pedidos?.nome_cliente?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
        item.sku?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
        item.descricao?.toLowerCase().includes(filtros.busca.toLowerCase())
      );
    }

    // Filtros de data (DD/MM/AAAA ou YYYY-MM-DD)
    const parseDate = (d?: string) => {
      if (!d) return null as Date | null;
      if (d.includes('/')) {
        const [dd, mm, yyyy] = d.split('/');
        return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
      }
      return new Date(`${d}T00:00:00`);
    };

    if (filtros.dataInicio) {
      const start = parseDate(filtros.dataInicio);
      itensFiltrados = itensFiltrados.filter((item: any) => {
        const dp = parseDate(item.pedidos?.data_pedido || item.data_pedido);
        return !start || (dp && dp >= start);
      });
    }

    if (filtros.dataFinal) {
      const end = parseDate(filtros.dataFinal);
      itensFiltrados = itensFiltrados.filter((item: any) => {
        const dp = parseDate(item.pedidos?.data_pedido || item.data_pedido);
        return !end || (dp && dp <= end);
      });
    }

    // Filtro por situação (mapeando PT -> valores reais salvos)
    if (filtros.situacoes && filtros.situacoes.length > 0) {
      const mapeamentoSituacoes: { [key: string]: string } = {
        'Em Aberto': 'Em aberto',
        'Aprovado': 'Aprovado', 
        'Preparando Envio': 'Preparando envio',
        'Faturado': 'Faturado',
        'Pronto para Envio': 'Pronto para envio',
        'Enviado': 'Enviado',
        'Entregue': 'Entregue',
        'Nao Entregue': 'Não entregue',
        'Cancelado': 'Cancelado'
      };
      const alvo = filtros.situacoes.map(s => (mapeamentoSituacoes[s] || s).toLowerCase());
      itensFiltrados = itensFiltrados.filter((item: any) => {
        const sit = (item.pedidos?.situacao || item.situacao || '').toLowerCase();
        return alvo.includes(sit);
      });
    }

    // Ordenar os dados 
    itensFiltrados.sort((a: any, b: any) => {
      // Primeiro por data (mais recente primeiro)
      const dataA = new Date(a.pedidos?.data_pedido || a.data_pedido);
      const dataB = new Date(b.pedidos?.data_pedido || b.data_pedido);
      if (dataA.getTime() !== dataB.getTime()) {
        return dataB.getTime() - dataA.getTime();
      }
      // Depois por valor (maior primeiro)
      const valorA = a.pedidos?.valor_total || a.valor_total || 0;
      const valorB = b.pedidos?.valor_total || b.valor_total || 0;
      return valorB - valorA;
    });

    return itensFiltrados;
  };

  // ✅ Nova função para buscar dados locais rapidamente
  const buscarDadosLocais = async () => {
    try {
      let query = supabase
        .from('itens_pedidos')
        .select(`
          *,
          pedidos!itens_pedidos_pedido_id_fkey (
            numero,
            numero_ecommerce,
            nome_cliente,
            cpf_cnpj,
            cidade,
            uf,
            data_pedido,
            data_prevista,
            situacao,
            codigo_rastreamento,
            url_rastreamento,
            obs,
            obs_interna,
            valor_frete,
            valor_desconto,
            valor_total
          )
        `);

      // Evitar filtros no servidor que exigem alias de relação (ambiguidade 300)
      // Todos os filtros (busca, datas e situação) serão aplicados localmente abaixo

      const { data, error } = await query
        .limit(5000);

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  };

  // Polling curto para aguardar dados do banco após iniciar o BG
  const aguardarDadosNovos = async (timeoutMs = 45000, intervaloMs = 1200) => {
    const inicio = Date.now();
    let ultimaQtd = 0;
    while (Date.now() - inicio < timeoutMs) {
      const dados = await buscarDadosLocais();
      const qtd = dados?.length || 0;
      if (qtd > 0 && qtd >= ultimaQtd) {
        const itensProcessados = await aplicarMapeamentos(aplicarFiltrosLocais(dados));
        localStorage.setItem('pedidos-dados-cache', JSON.stringify(itensProcessados));
        setItens(itensProcessados);
        calcularMetricas(itensProcessados);
        return true;
      }
      ultimaQtd = qtd;
      await new Promise((r) => setTimeout(r, intervaloMs));
    }
    return false;
  };

  // ✅ Sincronização em background sem bloquear UI
  const sincronizarEmBackground = async () => {
    try {
      console.log('🔄 Sincronizando dados em background...');
      
      const formatarDataParaTiny = (data: string): string => {
        if (!data) return '';
        if (data.includes('/')) return data;
        const [ano, mes, dia] = data.split('-');
        return `${dia}/${mes}/${ano}`;
      };

      // Tentar edge function com timeout reduzido
      const timeoutId = setTimeout(() => {
        console.log('⏰ Timeout na sincronização background, mantendo dados locais');
      }, 10000); // 10 segundos timeout

      const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-pedidos-rapido', {
        body: {
          filtros: {
            dataInicial: formatarDataParaTiny(filtros.dataInicio),
            dataFinal: formatarDataParaTiny(filtros.dataFinal),
            situacao: filtros.situacoes.length > 0 ? filtros.situacoes : undefined
          }
        }
      });

clearTimeout(timeoutId);

// Edge retornou 202 (started) ou payload inicial sem dados: iniciar polling curto
if (!syncError && (syncData?.started || (!syncData?.itens && !syncData?.pedidos))) {
  toast({ title: "Sincronização iniciada", description: "Carregando pedidos em segundos..." });
  await aguardarDadosNovos();
  return;
}

if (!syncError && syncData?.itens && syncData?.pedidos) {
        // Atualizar dados apenas se a sincronização trouxe mais resultados
        if (syncData.itens.length > itens.length) {
          const itensEnriquecidos = syncData.itens.map((item: any) => {
            const pedido = syncData.pedidos.find((p: any) => p.numero === item.numero_pedido);
            return {
              ...item,
              valor_total_pedido: pedido?.valor_total || 0,
              valor_frete_pedido: pedido?.valor_frete || 0,
              valor_desconto_pedido: pedido?.valor_desconto || 0,
              pedidos: pedido ? {
                numero_ecommerce: pedido.numero_ecommerce,
                nome_cliente: pedido.nome_cliente,
                cpf_cnpj: pedido.cpf_cnpj,
                cidade: pedido.cidade,
                uf: pedido.uf,
                data_pedido: pedido.data_pedido,
                data_prevista: pedido.data_prevista,
                situacao: pedido.situacao,
                codigo_rastreamento: pedido.codigo_rastreamento,
                url_rastreamento: pedido.url_rastreamento,
                obs: pedido.obs,
                obs_interna: pedido.obs_interna,
                valor_frete: pedido.valor_frete,
                valor_desconto: pedido.valor_desconto,
                valor_total: pedido.valor_total,
                canal_venda: pedido.canal_venda,
                nome_ecommerce: pedido.nome_ecommerce
              } : null
            };
          });

          // Aplicar filtros locais apenas nos dados já sincronizados
          let itensFiltrados = itensEnriquecidos;

          if (filtros.busca) {
            itensFiltrados = itensFiltrados.filter((item: any) => 
              item.numero_pedido?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
              item.pedidos?.nome_cliente?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
              item.sku?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
              item.descricao?.toLowerCase().includes(filtros.busca.toLowerCase())
            );
          }

          // ✅ ORDENAR OS DADOS ANTES DE APLICAR MAPEAMENTOS 
          itensFiltrados.sort((a: any, b: any) => {
            // Primeiro por data (mais recente primeiro)
            const dataA = new Date(a.pedidos?.data_pedido || a.data_pedido);
            const dataB = new Date(b.pedidos?.data_pedido || b.data_pedido);
            if (dataA.getTime() !== dataB.getTime()) {
              return dataB.getTime() - dataA.getTime();
            }
            // Depois por valor (maior primeiro)
            const valorA = a.pedidos?.valor_total || a.valor_total || 0;
            const valorB = b.pedidos?.valor_total || b.valor_total || 0;
            return valorB - valorA;
          });

          // ✅ IMPORTANTE: APLICAR MAPEAMENTOS MAS MANTER TODOS OS ITENS
          const itensProcessados = await aplicarMapeamentos(itensFiltrados);
          
          localStorage.setItem('pedidos-dados-cache', JSON.stringify(itensProcessados));
          setItens(itensProcessados);
          calcularMetricas(itensProcessados);

          toast({
            title: "✅ Sincronização background concluída",
            description: `${itensProcessados.length} itens atualizados`,
          });
        }
      }
    } catch (edgeFunctionError) {
      // Error handling silencioso para background sync
    }
  };

  // ✅ Nova função para sincronização com fallback robusto
  const sincronizarComFallback = async () => {
    try {
      const formatarDataParaTiny = (data: string): string => {
        if (!data) return '';
        if (data.includes('/')) return data;
        const [ano, mes, dia] = data.split('-');
        return `${dia}/${mes}/${ano}`;
      };

      // ✅ TENTAR EDGE FUNCTION PRIMEIRO
      try {
        const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-pedidos-rapido', {
          body: {
            filtros: {
              dataInicial: formatarDataParaTiny(filtros.dataInicio),
              dataFinal: formatarDataParaTiny(filtros.dataFinal),
              situacao: filtros.situacoes.length > 0 ? filtros.situacoes : undefined
            }
          }
        });
        // 202 Accepted: processamento em background iniciado
        if (!syncError && (syncData?.started || (!syncData?.itens && !syncData?.pedidos))) {
          toast({ title: "Sincronização iniciada", description: "Carregando pedidos em segundos..." });
          const ok = await aguardarDadosNovos();
          if (ok) return;
        }

        if (!syncError && syncData?.itens && syncData?.pedidos) {
          
          // Enriquecer itens com dados dos pedidos
          const itensComPedidos = syncData.itens.map((item: any) => {
            const pedido = syncData.pedidos.find((p: any) => p.numero === item.numero_pedido);
            return {
              ...item,
              valor_total_pedido: pedido?.valor_total || 0,
              valor_frete_pedido: pedido?.valor_frete || 0,
              valor_desconto_pedido: pedido?.valor_desconto || 0,
              pedidos: pedido ? {
                numero_ecommerce: pedido.numero_ecommerce,
                nome_cliente: pedido.nome_cliente,
                cpf_cnpj: pedido.cpf_cnpj,
                cidade: pedido.cidade,
                uf: pedido.uf,
                data_pedido: pedido.data_pedido,
                data_prevista: pedido.data_prevista,
                situacao: pedido.situacao,
                codigo_rastreamento: pedido.codigo_rastreamento,
                url_rastreamento: pedido.url_rastreamento,
                obs: pedido.obs,
                obs_interna: pedido.obs_interna,
                valor_frete: pedido.valor_frete,
                valor_desconto: pedido.valor_desconto,
                valor_total: pedido.valor_total,
                canal_venda: pedido.canal_venda,
                nome_ecommerce: pedido.nome_ecommerce
              } : null
            };
          });

          // Aplicar filtros locais
          const itensFiltrados = aplicarFiltrosLocais(itensComPedidos);
          
          // ✅ IMPORTANTE: APLICAR MAPEAMENTOS MAS MANTER TODOS OS ITENS
          const itensProcessados = await aplicarMapeamentos(itensFiltrados);
          
          localStorage.setItem('pedidos-dados-cache', JSON.stringify(itensProcessados));
          setItens(itensProcessados);
          calcularMetricas(itensProcessados);

          toast({
            title: "✅ Sincronização concluída",
            description: `${itensProcessados.length} itens encontrados - incluindo itens sem estoque/mapeamento para análise`,
          });
          
          return; // Sucesso com edge function
        } else {
          console.warn('❌ Edge function falhou:', syncError?.message || 'Sem dados retornados');
        }
      } catch (edgeFunctionError) {
        console.warn('❌ Erro na edge function:', edgeFunctionError);
      }

      // ✅ FALLBACK: CONSULTA DIRETA NO BANCO (MOSTRA TODOS OS PEDIDOS)
      console.log('⚠️ Usando fallback direto no banco para mostrar TODOS os pedidos...');
      
      const data = await buscarDadosLocais();
      console.log(`🎯 Fallback: ${data?.length || 0} itens encontrados no banco local`);

      // ✅ PROCESSAR E APLICAR MAPEAMENTOS SEM FILTRAR NADA
      const itensProcessados = await aplicarMapeamentos(data || []);
      
      localStorage.setItem('pedidos-dados-cache', JSON.stringify(itensProcessados));
      setItens(itensProcessados);
      calcularMetricas(itensProcessados);

      toast({
        title: "✅ Dados carregados localmente",
        description: `${itensProcessados.length} itens encontrados no banco local`,
      });
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      setError(error instanceof Error ? error.message : 'Erro na sincronização');
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

      // Buscar histórico de vendas para verificar itens já processados e obter sku_kit/qtd_kit
      const { data: historicoVendas } = await supabase
        .from('historico_vendas')
        .select('id_unico, status, sku_kit, qtd_kit, numero_pedido, sku_produto');

      

      return itensRaw.map(item => {
        const pedidoData = item.pedidos;
        
        // Aplicar mapeamento DE/PARA
        const mapeamento = mapeamentos?.find(m => m.sku_pedido === item.sku);
        const skuCorrespondente = mapeamento?.sku_correspondente || item.sku;
        const skuSimples = mapeamento?.sku_simples;
        
        // Buscar dados do produto no estoque
        const produto = produtos?.find(p => p.sku_interno === skuCorrespondente);

        // Verificar se já foi processado no histórico e obter dados sku_kit/qtd_kit
        const idUnico = `${item.numero_pedido}-${item.sku}`;
        const historicoItem = historicoVendas?.find(h => 
          h.numero_pedido === item.numero_pedido && h.sku_produto === item.sku
        );
        const jaProcessado = historicoItem?.status === 'estoque_baixado';


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
          cidade: pedidoData.cidade,
          uf: pedidoData.uf,
          data_pedido: pedidoData.data_pedido,
          data_prevista: pedidoData.data_prevista,
          situacao: pedidoData.situacao,
          codigo_rastreamento: pedidoData.codigo_rastreamento,
          url_rastreamento: pedidoData.url_rastreamento,
          obs: pedidoData.obs,
          obs_interna: pedidoData.obs_interna,
          valor_frete: pedidoData.valor_frete,
          valor_desconto: pedidoData.valor_desconto,
          // ✅ NOVAS COLUNAS SOLICITADAS
          canal_venda: pedidoData.canal_venda,
          nome_ecommerce: pedidoData.nome_ecommerce,
          created_at: item.created_at,
          updated_at: item.updated_at,
          // ✅ CAMPOS PARA BAIXA DE ESTOQUE (obtidos do historico_vendas ou mapeamento)
          sku_kit: historicoItem?.sku_kit || skuCorrespondente,
          qtd_kit: historicoItem?.qtd_kit || 1,
          // Dados do mapeamento e produto
          sku_correspondente: skuCorrespondente !== item.sku ? skuCorrespondente : undefined,
          sku_simples: skuSimples,
          produto_nome: produto?.nome,
          produto_categoria: produto?.categoria,
          estoque_atual: produto?.quantidade_atual,
          // Status de processamento
          ja_processado: jaProcessado
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

    const novasMetricas = {
      totalItens,
      totalPedidos,
      pedidosPendentes,
      pedidosAprovados,
      pedidosEnviados,
      pedidosEntregues,
      valorTotal
    };

    // ✅ Salvar métricas no localStorage para persistir entre navegações
    localStorage.setItem('pedidos-metricas-cache', JSON.stringify(novasMetricas));
    
    setMetricas(novasMetricas);
  };

  const atualizarFiltros = (novosFiltros: Partial<FiltrosPedidos>) => {
    setFiltros(prev => ({ ...prev, ...novosFiltros }));
    // Não buscar automaticamente - apenas atualizar filtros
  };

  const limparFiltros = () => {
    const hoje = new Date();
    const primeiroDiaDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDiaDoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    
    const filtrosLimpos = {
      busca: '',
      dataInicio: primeiroDiaDoMes.toISOString().split('T')[0],  // Formato YYYY-MM-DD
      dataFinal: ultimoDiaDoMes.toISOString().split('T')[0],     // Formato YYYY-MM-DD (corrigido)
      situacoes: []                 // ✅ Sem filtro para buscar todas
    };
    setFiltros(filtrosLimpos);
    localStorage.setItem('filtros-pedidos', JSON.stringify(filtrosLimpos));
    // Não buscar automaticamente - apenas limpar filtros
  };

  const buscarComFiltros = () => {
    buscarItens();
  };

  const recarregarDados = () => {
    buscarItens();
  };

  const obterDetalhesPedido = async (numeroPedido: string, integrationAccountId?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('obter-pedido-tiny', {
        body: { numeroPedido, integration_account_id: integrationAccountId }
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

  const editarItem = async (itemEditado: Partial<ItemPedido>) => {
    try {
      if (!itemEditado.id) {
        throw new Error('ID do item é obrigatório para edição');
      }

      // Atualizar item na tabela itens_pedidos
      const { error: itemError } = await supabase
        .from('itens_pedidos')
        .update({
          sku: itemEditado.sku,
          descricao: itemEditado.descricao,
          quantidade: itemEditado.quantidade,
          valor_unitario: itemEditado.valor_unitario,
          valor_total: itemEditado.valor_total,
          ncm: itemEditado.ncm,
          codigo_barras: itemEditado.codigo_barras,
          observacoes: itemEditado.observacoes,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemEditado.id);

      if (itemError) throw itemError;

      // Se houver dados do pedido, atualizar na tabela pedidos
      if (itemEditado.pedido_id && (
        itemEditado.nome_cliente || 
        itemEditado.situacao || 
        itemEditado.codigo_rastreamento ||
        itemEditado.url_rastreamento ||
        itemEditado.obs ||
        itemEditado.obs_interna
      )) {
        const { error: pedidoError } = await supabase
          .from('pedidos')
          .update({
            nome_cliente: itemEditado.nome_cliente,
            situacao: itemEditado.situacao,
            codigo_rastreamento: itemEditado.codigo_rastreamento,
            url_rastreamento: itemEditado.url_rastreamento,
            obs: itemEditado.obs,
            obs_interna: itemEditado.obs_interna,
            updated_at: new Date().toISOString()
          })
          .eq('id', itemEditado.pedido_id);

        if (pedidoError) throw pedidoError;
      }

      // Recarregar dados para refletir as mudanças
      await buscarItens();

      toast({
        title: "Sucesso",
        description: "Item atualizado com sucesso",
      });

    } catch (err) {
      console.error('Erro ao editar item:', err);
      toast({
        title: "Erro",
        description: "Erro ao salvar alterações",
        variant: "destructive",
      });
      throw err;
    }
  };

  const processarItem = async (item: ItemPedido) => {
    try {
      // Simular processamento (baixa de estoque, registro no histórico, etc.)
      
      // 1. Registrar no histórico
      const registroHistorico = {
        tipo: 'processamento_pedido',
        descricao: `Processamento do pedido ${item.numero_pedido}`,
        detalhes: {
          id_unico: `${item.numero_pedido}-${item.sku}-${Date.now()}`,
          data_processamento: new Date().toISOString(),
          numero_pedido: item.numero_pedido,
          sku_pedido: item.sku,
          sku_estoque: item.sku_correspondente || item.sku,
          quantidade_pedido: item.quantidade,
          quantidade_baixada: item.quantidade,
          tipo_produto: item.produto_categoria || 'produto',
          status: 'Processado',
          observacoes: `Processado automaticamente via sistema DE/PARA`
        }
      };

      const { error: historicoError } = await supabase
        .from('historico')
        .insert(registroHistorico);

      if (historicoError) throw historicoError;

      // 2. Simular baixa de estoque (se necessário)
      if (item.sku_correspondente) {
        // Aqui seria feita a baixa real no estoque
        console.log(`Baixa de estoque simulada: ${item.sku_correspondente} - ${item.quantidade} unidades`);
      }

      // 3. Atualizar status do item (se necessário)
      const { error: updateError } = await supabase
        .from('pedidos')
        .update({
          situacao: 'processado',
          updated_at: new Date().toISOString()
        })
        .eq('id', item.pedido_id);

      if (updateError) {
        console.warn('Erro ao atualizar situação do pedido:', updateError);
        // Não bloquear o processamento por este erro
      }

      toast({
        title: "Sucesso",
        description: `Pedido #${item.numero_pedido} processado com sucesso`,
      });

      // Recarregar dados para refletir as mudanças
      await buscarItens();

    } catch (err) {
      console.error('Erro ao processar item:', err);
      toast({
        title: "Erro",
        description: "Erro durante o processamento",
        variant: "destructive",
      });
      throw err;
    }
  };

  // ✅ Removido: Busca inicial automática
  // A busca será controlada manualmente pelo usuário através dos botões/filtros

  // ❌ REMOVIDO: Real-time subscription automática
  // A subscription será controlada pelo usuário através das configurações de sincronização
  // useEffect(() => {
  //   const channel = supabase
  //     .channel('itens-pedidos-changes')
  //     .on(
  //       'postgres_changes',
  //       {
  //         event: '*',
  //         schema: 'public',
  //         table: 'itens_pedidos'
  //       },
  //       () => {
  //         buscarItens();
  //       }
  //     )
  //     .on(
  //       'postgres_changes',
  //       {
  //         event: '*',
  //         schema: 'public',
  //         table: 'pedidos'
  //       },
  //       () => {
  //         buscarItens();
  //       }
  //     )
  //     .subscribe();

  //   return () => {
  //     supabase.removeChannel(channel);
  //   };
  // }, []);

  return {
    itens,
    metricas,
    loading,
    error,
    filtros,
    atualizarFiltros,
    limparFiltros,
    buscarComFiltros,
    recarregarDados,
    obterDetalhesPedido,
    editarItem,
    processarItem
  };
}
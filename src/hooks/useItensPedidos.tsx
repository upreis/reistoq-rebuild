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
  // Novos campos solicitados
  cidade?: string;
  uf?: string;
  valor_total_pedido?: number;
  total_itens?: number;
  valor_produtos?: number;
  // Dados do mapeamento DE/PARA (aplicado na exibição)
  sku_correspondente?: string;
  sku_simples?: string;
  produto_nome?: string;
  produto_categoria?: string;
  estoque_atual?: number;
  ja_processado?: boolean;
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
        console.warn('Erro ao carregar dados salvos:', error);
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
        console.warn('Erro ao carregar métricas salvas:', error);
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
  const [filtros, setFiltros] = useState<FiltrosPedidos>(() => {
    // ✅ Carregar filtros salvos do localStorage
    const filtrosSalvos = localStorage.getItem('filtros-pedidos');
    if (filtrosSalvos) {
      try {
        return JSON.parse(filtrosSalvos);
      } catch (error) {
        console.warn('Erro ao carregar filtros salvos:', error);
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

      // ✅ SOLUÇÃO 4: ARQUITETURA OTIMIZADA - Usar sync-pedidos-rapido que retorna dados diretamente
      console.log('🚀 Sincronizando pedidos com arquitetura otimizada...');
      
      // ✅ SOLUÇÃO 1: SEMPRE usar formato DD/MM/YYYY para edge functions
      const formatarDataParaTiny = (data: string): string => {
        if (!data) return '';
        // Se já está em DD/MM/YYYY, usar como está
        if (data.includes('/')) return data;
        // Se está em YYYY-MM-DD, converter para DD/MM/YYYY
        const [ano, mes, dia] = data.split('-');
        return `${dia}/${mes}/${ano}`;
      };

      const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-pedidos-rapido', {
        body: {
          filtros: {
            dataInicial: formatarDataParaTiny(filtros.dataInicio),
            dataFinal: formatarDataParaTiny(filtros.dataFinal),
            // ✅ SOLUÇÃO 2: Situações já são convertidas corretamente na edge function
            situacao: filtros.situacoes.length > 0 ? filtros.situacoes : undefined
          }
        }
      });

      if (syncError) {
        console.warn('❌ Erro na sincronização com Tiny ERP:', syncError);
        toast({
          title: "Erro",
          description: "Erro na sincronização com Tiny ERP. Tente novamente.",
          variant: "destructive",
        });
        throw syncError;
      }

      // ✅ SOLUÇÃO 4: USAR DADOS RETORNADOS DIRETAMENTE (eliminar consulta local duplicada)
      if (syncData?.itens && syncData?.pedidos) {
        console.log(`🎯 Recebidos ${syncData.itens.length} itens e ${syncData.pedidos.length} pedidos diretamente`);
        console.log('📊 Exemplo de pedido completo:', syncData.pedidos[0]);
        console.log('📦 Exemplo de item completo:', syncData.itens[0]);
        
        // Enriquecer itens com dados dos pedidos
        const itensComPedidos = syncData.itens.map((item: any) => {
          const pedido = syncData.pedidos.find((p: any) => p.numero === item.numero_pedido);
          // Calcular total de itens do pedido
          const totalItensPedido = syncData.itens
            .filter((i: any) => i.numero_pedido === item.numero_pedido)
            .reduce((sum: number, i: any) => sum + (i.quantidade || 0), 0);
          
          // Calcular valor total dos produtos (sem frete e desconto)
          const valorProdutosPedido = syncData.itens
            .filter((i: any) => i.numero_pedido === item.numero_pedido)
            .reduce((sum: number, i: any) => sum + (i.valor_total || 0), 0);
          
          console.log(`🔍 Processando item ${item.sku} do pedido ${item.numero_pedido}:`, {
            pedido_encontrado: !!pedido,
            cidade: pedido?.cidade,
            uf: pedido?.uf,
            valor_total_pedido: pedido?.valor_total,
            total_itens: totalItensPedido,
            valor_produtos: valorProdutosPedido
          });
          
          return {
            ...item,
            pedidos: pedido ? {
              numero_ecommerce: pedido.numero_ecommerce,
              nome_cliente: pedido.nome_cliente,
              cpf_cnpj: pedido.cpf_cnpj,
              data_pedido: pedido.data_pedido,
              data_prevista: pedido.data_prevista,
              situacao: pedido.situacao,
              codigo_rastreamento: pedido.codigo_rastreamento,
              url_rastreamento: pedido.url_rastreamento,
              obs: pedido.obs,
              obs_interna: pedido.obs_interna,
              valor_frete: pedido.valor_frete,
              valor_desconto: pedido.valor_desconto,
              // Novos campos calculados
              cidade: pedido.cidade,
              uf: pedido.uf,
              valor_total_pedido: pedido.valor_total,
              total_itens: totalItensPedido,
              valor_produtos: valorProdutosPedido
            } : null
          };
        });

        // Aplicar filtros locais apenas nos dados já sincronizados
        let itensFiltrados = itensComPedidos;

        if (filtros.busca) {
          itensFiltrados = itensFiltrados.filter((item: any) => 
            item.numero_pedido?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
            item.pedidos?.nome_cliente?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
            item.sku?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
            item.descricao?.toLowerCase().includes(filtros.busca.toLowerCase())
          );
        }

        // Processar dados e aplicar mapeamento DE/PARA
        const itensProcessados = await aplicarMapeamentos(itensFiltrados);
        
        // ✅ Salvar dados no localStorage para persistir entre navegações
        localStorage.setItem('pedidos-dados-cache', JSON.stringify(itensProcessados));
        
        setItens(itensProcessados);
        calcularMetricas(itensProcessados);

        toast({
          title: "✅ Sincronização concluída",
          description: syncData.message || `${itensProcessados.length} itens carregados com sucesso`,
        });
      } else {
        // Fallback: usar consulta local se edge function não retornar dados
        console.log('⚠️ Edge function não retornou dados. Usando fallback...');
        
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

        if (filtros.dataFinal) {
          query = query.filter('pedidos.data_pedido', 'lte', filtros.dataFinal);
        }

        if (filtros.situacoes.length > 0) {
          // ✅ SOLUÇÃO 2: Mapear situações corretamente
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
          
          const situacoesMapeadas = filtros.situacoes.map(s => mapeamentoSituacoes[s] || s);
          query = query.filter('pedidos.situacao', 'in', `(${situacoesMapeadas.join(',')})`);
        }

        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(10000);

        if (error) {
          throw error;
        }

        // Processar dados e aplicar mapeamento DE/PARA
        const itensProcessados = await aplicarMapeamentos(data || []);
        
        // ✅ Salvar dados no localStorage para persistir entre navegações
        localStorage.setItem('pedidos-dados-cache', JSON.stringify(itensProcessados));
        
        setItens(itensProcessados);
        calcularMetricas(itensProcessados);

        toast({
          title: "Dados carregados",
          description: `${data?.length || 0} itens carregados do cache local`,
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

      // Buscar histórico de vendas para verificar itens já processados
      const { data: historicoVendas } = await supabase
        .from('historico_vendas')
        .select('id_unico, status')
        .eq('status', 'estoque_baixado');

      console.log(`Aplicando mapeamentos: ${mapeamentos?.length || 0} mapeamentos, ${produtos?.length || 0} produtos, ${historicoVendas?.length || 0} histórico`);

      return itensRaw.map(item => {
        const pedidoData = item.pedidos;
        
        console.log(`🔧 Mapeando item ${item.sku}:`, {
          numero_pedido: item.numero_pedido,
          tem_objeto_pedidos: !!item.pedidos,
          dados_pedido: pedidoData,
          cidade_direta: item.cidade,
          cidade_pedidos: item.pedidos?.cidade,
          uf_direta: item.uf,
          uf_pedidos: item.pedidos?.uf,
          valor_total_direta: item.valor_total_pedido,
          valor_total_pedidos: item.pedidos?.valor_total_pedido
        });
        
        // Função auxiliar para obter dados com fallbacks múltiplos
        const obterDado = (campo: string) => {
          return item[campo] || 
                 (item.pedidos && item.pedidos[campo]) || 
                 (pedidoData && pedidoData[campo]) || 
                 null;
        };
        
        // Aplicar mapeamento DE/PARA
        const mapeamento = mapeamentos?.find(m => m.sku_pedido === item.sku);
        const skuCorrespondente = mapeamento?.sku_correspondente || item.sku;
        const skuSimples = mapeamento?.sku_simples;
        
        // Buscar dados do produto no estoque
        const produto = produtos?.find(p => p.sku_interno === skuCorrespondente);

        // Verificar se já foi processado no histórico
        const idUnico = `${item.numero_pedido}-${item.sku}`;
        const jaProcessado = historicoVendas?.some(h => h.id_unico === idUnico);

        console.log(`Item ${item.sku}: mapeamento=${!!mapeamento}, produto=${!!produto}, jaProcessado=${jaProcessado}`);

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
          // Dados do pedido - usar função auxiliar para obter com fallbacks
          numero_ecommerce: obterDado('numero_ecommerce'),
          nome_cliente: obterDado('nome_cliente'),
          cpf_cnpj: obterDado('cpf_cnpj'),
          data_pedido: obterDado('data_pedido'),
          data_prevista: obterDado('data_prevista'),
          situacao: obterDado('situacao'),
          codigo_rastreamento: obterDado('codigo_rastreamento'),
          url_rastreamento: obterDado('url_rastreamento'),
          obs: obterDado('obs'),
          obs_interna: obterDado('obs_interna'),
          valor_frete: obterDado('valor_frete') || 0,
          valor_desconto: obterDado('valor_desconto') || 0,
          created_at: item.created_at,
          updated_at: item.updated_at,
          // CORRIGIDO: Novos campos solicitados - usar função auxiliar
          cidade: obterDado('cidade'),
          uf: obterDado('uf'),
          valor_total_pedido: obterDado('valor_total_pedido') || obterDado('valor_total'),
          total_itens: obterDado('total_itens'),
          valor_produtos: obterDado('valor_produtos'),
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
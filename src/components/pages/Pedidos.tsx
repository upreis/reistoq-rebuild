import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useItensPedidos, type ItemPedido } from "@/hooks/useItensPedidos";
import { usePedidosPaginado } from "@/hooks/usePedidosPaginado";
import { useDeParaIntegration, type ItemPedidoEnriquecido } from "@/hooks/useDeParaIntegration";
import { PedidosBarraStatus } from "@/components/pedidos/PedidosBarraStatus";
import { FiltrosAvancadosPedidos, type FiltrosAvancados } from "@/components/pedidos/FiltrosAvancadosPedidos";
import { DashboardMiniPedidos } from "@/components/pedidos/DashboardMiniPedidos";
import { PedidosTabelaAvancada } from "@/components/pedidos/PedidosTabelaAvancada";
import { PedidosControleSincronizacao } from "@/components/pedidos/PedidosControleSincronizacao";
import { PedidosBarraAcoes } from "@/components/pedidos/PedidosBarraAcoes";
import { PedidoDetalhesModal } from "@/components/pedidos/PedidoDetalhesModal";
import { PedidoEditModal } from "@/components/pedidos/PedidoEditModal";
import { PedidoProcessamentoModal } from "@/components/pedidos/PedidoProcessamentoModal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, TrendingDown, Loader2, Package } from "lucide-react";

// Force rebuild to clear cache
export function Pedidos() {
  const {
    itens,
    metricas,
    loading,
    error,
    filtros: filtrosBase,
    atualizarFiltros: atualizarFiltrosBase,
    limparFiltros,
    buscarComFiltros,
    recarregarDados,
    obterDetalhesPedido,
    editarItem,
    processarItem
  } = useItensPedidos();

  // Converter filtros para o novo formato
  const filtros: FiltrosAvancados = {
    busca: filtrosBase.busca,
    dataInicio: filtrosBase.dataInicio,
    dataFinal: filtrosBase.dataFinal,
    situacoes: filtrosBase.situacoes,
    valorMinimo: 0,
    valorMaximo: 0,
    clienteVip: false,
    fonte: filtrosBase as any && (localStorage.getItem('pedidos-fonte') as 'interno' | 'mercadolivre' | 'ambas') || 'interno',
    mlPedidoId: localStorage.getItem('mlPedidoId') || '',
    mlComprador: localStorage.getItem('mlComprador') || '',
    mlFulfillmentOnly: localStorage.getItem('mlFulfillmentOnly') === 'true'
  };

  const atualizarFiltros = (novosFiltros: Partial<FiltrosAvancados>) => {
    // Converter de volta para o formato original
    const filtrosOriginais = {
      busca: novosFiltros.busca ?? filtros.busca,
      dataInicio: novosFiltros.dataInicio ?? filtros.dataInicio,
      dataFinal: novosFiltros.dataFinal ?? filtros.dataFinal,
      situacoes: novosFiltros.situacoes ?? filtros.situacoes
    };
    if (typeof novosFiltros.fonte !== 'undefined') {
      localStorage.setItem('pedidos-fonte', novosFiltros.fonte);
    }
    if (typeof (novosFiltros as any).mlPedidoId !== 'undefined') {
      localStorage.setItem('mlPedidoId', (novosFiltros as any).mlPedidoId || '');
    }
    if (typeof (novosFiltros as any).mlComprador !== 'undefined') {
      localStorage.setItem('mlComprador', (novosFiltros as any).mlComprador || '');
    }
    if (typeof (novosFiltros as any).mlFulfillmentOnly !== 'undefined') {
      localStorage.setItem('mlFulfillmentOnly', String((novosFiltros as any).mlFulfillmentOnly));
    }
    atualizarFiltrosBase(filtrosOriginais);
  };

  const { enriquecerItensPedidos } = useDeParaIntegration();
  const [fonte, setFonte] = useState<'interno' | 'mercadolivre' | 'ambas'>((localStorage.getItem('pedidos-fonte') as any) || 'interno');
  
  // Estados dos modais
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [modalEdicao, setModalEdicao] = useState(false);
  const [modalProcessamento, setModalProcessamento] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<ItemPedido | null>(null);
  const [processandoBaixaEstoque, setProcessandoBaixaEstoque] = useState(false);
  const [estoqueDisponivel, setEstoqueDisponivel] = useState<Record<string, number>>({});
  const [itensSelecionados, setItensSelecionados] = useState<ItemPedidoEnriquecido[]>([]);

  // Dados vindos do Mercado Livre
  const [mlItens, setMlItens] = useState<ItemPedido[]>([]);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlMetricas, setMlMetricas] = useState({
    totalItens: 0,
    totalPedidos: 0,
    pedidosPendentes: 0,
    pedidosAprovados: 0,
    pedidosEnviados: 0,
    pedidosEntregues: 0,
    valorTotal: 0,
  });

  // Contas Mercado Livre
  const [contasML, setContasML] = useState<any[]>([]);
  const [mlContaId, setMlContaId] = useState<string>('all');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('integration_accounts')
        .select('*')
        .eq('provider', 'mercadolivre')
        .order('name', { ascending: true });
      setContasML(data || []);
    })();
  }, []);

  // Escolher fonte de dados
  const baseItens = filtros.fonte === 'mercadolivre' 
    ? mlItens 
    : (filtros.fonte === 'ambas' ? [...itens, ...mlItens] : itens);
  // Enriquecer itens com dados do DE/PARA
  const itensEnriquecidos = enriquecerItensPedidos(baseItens);

  // Função para verificar estoque disponível
  const verificarEstoqueDisponivel = async () => {
    if (itensEnriquecidos.length === 0) return;
    
    try {
      // ✅ CORRIGIDO: Usar sku_kit para verificar estoque
      const skusParaVerificar = itensEnriquecidos
        .map(item => item.sku_kit || item.sku)
        .filter(Boolean);
      
      if (skusParaVerificar.length > 0) {
        const { data: produtos } = await supabase
          .from('produtos')
          .select('sku_interno, quantidade_atual')
          .in('sku_interno', skusParaVerificar);
        
        if (produtos) {
          const estoqueMap: Record<string, number> = {};
          produtos.forEach(produto => {
            estoqueMap[produto.sku_interno] = produto.quantidade_atual || 0;
          });
          setEstoqueDisponivel(estoqueMap);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar estoque:', error);
    }
  };

  // Função para obter status do estoque de um item
  const obterStatusEstoque = (item: any) => {
    if (item.ja_processado) return 'processado';
    if (processandoBaixaEstoque) return 'processando';
    
    // ✅ CORRIGIDO: Usar sku_kit para verificar estoque
    const skuProduto = item.sku_kit || item.sku;
    if (!skuProduto) return 'sem-mapeamento';
    
    const estoqueAtual = estoqueDisponivel[skuProduto] || 0;
    // ✅ CORRIGIDO: Quantidade necessária = QTD KIT x Qtd
    const quantidadeNecessaria = (item.qtd_kit || 1) * item.quantidade;
    
    if (estoqueAtual < quantidadeNecessaria) return 'sem-estoque';
    return 'disponivel';
  };

  // useEffect para verificar estoque quando itens mudarem
  useEffect(() => {
    if (itensEnriquecidos.length > 0) {
      verificarEstoqueDisponivel();
    }
  }, [itensEnriquecidos.length]);

  // useEffect para auto-selecionar itens elegíveis quando dados carregarem
  useEffect(() => {
    if (itensEnriquecidos.length > 0 && Object.keys(estoqueDisponivel).length > 0) {
      const itensElegiveis = itensEnriquecidos.filter(item => {
        const status = obterStatusEstoque(item);
        return status === 'disponivel';
      });
      setItensSelecionados(itensElegiveis);
    }
  }, [itensEnriquecidos.length, estoqueDisponivel]);

  const {
    pedidosPaginados,
    paginaAtual,
    totalPaginas,
    irParaPagina,
    proximaPagina,
    paginaAnterior,
    totalItens,
    itemInicial,
    itemFinal
  } = usePedidosPaginado({ pedidos: baseItens });

  const parseToISO = (d?: string) => {
    if (!d) return '';
    if (d.includes('/')) {
      const [dd, mm, yyyy] = d.split('/');
      return `${yyyy}-${mm}-${dd}`;
    }
    return d;
  };

  const buscarPedidosML = async () => {
    try {
      setMlLoading(true);
      const from = parseToISO(filtros.dataInicio);
      const to = parseToISO(filtros.dataFinal);
      const baseQs = new URLSearchParams();
      if (from) baseQs.set('from', from);
      if (to) baseQs.set('to', to);
      // Garantir retorno de campos detalhados (buyer, order_items.seller_sku, feedback, shipping, etc.)
      baseQs.set('expand', 'details');
      // Apenas enviar status quando a fonte for Mercado Livre e o valor for suportado pela API ML
      const allowedMLStatuses = new Set(['paid', 'cancelled', 'confirmed', 'payment_required', 'payment_in_process']);
      const status = filtros.fonte === 'mercadolivre' ? filtros.situacoes?.[0] : undefined;
      if (status) {
        // O usuário pode selecionar status Tiny (português) ou ML (inglês). Normalizamos aqui.
        const mapTinyToML: Record<string, string> = {
          'em aberto': 'confirmed',
          'aprovado': 'paid',
          'cancelado': 'cancelled',
          'não entregue': '',
          'nao entregue': '',
          'preparando envio': '',
          'faturado': '',
          'pronto para envio': '',
          'enviado': '',
          'entregue': '',
        };
        const key = status.toLowerCase();
        const normalized = mapTinyToML[key] ?? key; // se já for ML, mantém
        if (normalized && allowedMLStatuses.has(normalized)) {
          baseQs.set('status', normalized);
        }
      }
      if (filtros.mlFulfillmentOnly) {
        baseQs.set('logistics_type', 'fulfillment');
      }

      const { data: session } = await supabase.auth.getSession();
      const headers = {
        'Authorization': session.session ? `Bearer ${session.session.access_token}` : '',
        'apikey': (supabase as any).headers?.apikey || ''
      } as const;

      const mapResultsToItems = (results: any[], empresaLabel: string, integrationAccountId?: string): ItemPedido[] =>
        results.flatMap((order: any) => {
          const buyer = order.buyer || {};
          const items = order.order_items || [];
          return items.map((oi: any, idx: number) => ({
            id: `${order.id}-${idx}`,
            pedido_id: String(order.id),
            numero_pedido: String(order.id),
            // SKU Pedido deve refletir EXATAMENTE o seller_sku do ML (sem fallback)
            sku: (oi?.item?.seller_sku ?? ''),
            descricao: oi?.item?.title || 'Item',
            quantidade: oi?.quantity || 1,
            valor_unitario: oi?.unit_price || order?.total_amount || 0,
            valor_total: (oi?.unit_price || 0) * (oi?.quantity || 1),
            numero_ecommerce: String(order.id),
            nome_cliente: `${buyer?.first_name || ''} ${buyer?.last_name || ''}`.trim() || buyer?.nickname || 'Cliente ML',
            cpf_cnpj: buyer?.billing_info?.doc_number || undefined,
            cidade: order?.shipping?.receiver_address?.city?.name || undefined,
            uf: order?.shipping?.receiver_address?.state?.id || undefined,
            data_pedido: (order?.date_created || '').slice(0, 10),
            data_prevista: undefined,
            situacao: order?.status || 'Aprovado',
            codigo_rastreamento: order?.shipping?.tracking_number || undefined,
            url_rastreamento: order?.shipping?.tracking_url || undefined,
            obs: undefined,
            obs_interna: undefined,
            valor_frete: order?.shipping_cost || 0,
            valor_desconto: 0,
            empresa: empresaLabel,
            numero_venda: String(order?.id),
            integration_account_id: integrationAccountId,
          }));
        });

      const fetchForAccount = async (acc: any): Promise<ItemPedido[]> => {
        const qs = new URLSearchParams(baseQs);
        if (acc?.id) qs.set('account_id', acc.id);
        const resp = await fetch(`https://tdjyfqnxvjgossuncpwm.supabase.co/functions/v1/mercadolivre-orders-proxy?${qs.toString()}`, { headers });
        const text = await resp.text();
        let json: any = null;
        try { json = text ? JSON.parse(text) : null; } catch (_) { /* resposta não JSON */ }
        if (!resp.ok) {
          const msg = (json && (json.error || json.message || (json.details && (json.details.message || json.details.error || JSON.stringify(json.details))))) || text || `Erro HTTP ${resp.status}`;
          throw new Error(msg);
        }
        const results = (json && (json.results || json.orders)) || [];
        const empresaLabel = acc?.name || acc?.account_identifier || acc?.cnpj || 'Mercado Livre';
        return mapResultsToItems(Array.isArray(results) ? results : [], empresaLabel, acc?.id);
      };

      let mapped: ItemPedido[] = [];
      if (mlContaId === 'all') {
        const qs = new URLSearchParams(baseQs);
        qs.set('all', 'true');
        const resp = await fetch(`https://tdjyfqnxvjgossuncpwm.supabase.co/functions/v1/mercadolivre-orders-proxy?${qs.toString()}`, { headers });
        const text = await resp.text();
        let json: any = null;
        try { json = text ? JSON.parse(text) : null; } catch (_) {}
        if (!resp.ok) {
          const msg = (json && (json.error || json.message || (json.details && (json.details.message || json.details.error || JSON.stringify(json.details))))) || text || `Erro HTTP ${resp.status}`;
          throw new Error(msg);
        }
        const results = (json && (json.results || json.orders)) || [];
        mapped = mapResultsToItems(Array.isArray(results) ? results : [], 'Mercado Livre');
      } else {
        const acc = contasML.find(c => c.id === mlContaId);
        if (!acc) throw new Error('Conta selecionada não encontrada');
        mapped = await fetchForAccount(acc);
      }

      // Filtro local por ID do pedido e comprador (nickname/email)
      let filtered = mapped;
      if (filtros.mlPedidoId) {
        const idQuery = String(filtros.mlPedidoId).toLowerCase();
        filtered = filtered.filter(i => String(i.numero_pedido).toLowerCase().includes(idQuery));
      }
      if (filtros.mlComprador) {
        const buyerQuery = String(filtros.mlComprador).toLowerCase();
        filtered = filtered.filter(i => (i.nome_cliente || '').toLowerCase().includes(buyerQuery));
      }

      setMlItens(filtered);
      toast({ title: 'Pedidos ML carregados', description: `${filtered.length} itens` });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erro', description: e.message || 'Falha ao buscar ML', variant: 'destructive' });
    } finally {
      setMlLoading(false);
    }
  };

  const handleBuscarPedidos = async () => {
    try {
      // ✅ NOVO: Marcar processo como iniciado
      await supabase.functions.invoke('sync-control', {
        body: { 
          action: 'start',
          process_name: 'sync-pedidos-rapido',
          progress: {
            started_at: new Date().toISOString(),
            current_step: 'Iniciando busca...'
          }
        }
      });

      if (filtros.fonte === 'mercadolivre') {
        await buscarPedidosML();
      } else if (filtros.fonte === 'ambas') {
        // Buscar interno e Mercado Livre
        buscarComFiltros();
        await buscarPedidosML();
      } else {
        buscarComFiltros();
      }
      toast({
        title: 'Buscando pedidos',
        description: filtros.fonte === 'mercadolivre' 
          ? 'Consultando API do Mercado Livre...'
          : (filtros.fonte === 'ambas' ? 'Consultando Interno e Mercado Livre...' : 'Carregando do banco interno...'),
      });
    } catch (error) {
      console.error('Erro ao iniciar busca:', error);
      if (filtros.fonte === 'mercadolivre') await buscarPedidosML(); else buscarComFiltros();
      toast({
        title: 'Buscando pedidos',
        description: 'Os pedidos estão sendo carregados com os filtros aplicados.',
      });
    } finally {
      // ✅ Finalizar status para não ficar preso em "Iniciando busca..."
      try {
        await supabase.functions.invoke('sync-control', {
          body: {
            action: 'stop',
            process_name: 'sync-pedidos-rapido',
            progress: {
              finished_at: new Date().toISOString(),
              current_step: 'Concluído'
            }
          }
        });
      } catch (e) {
        console.warn('Falha ao atualizar status do sync-control:', e);
      }
    }
  };


  const handleVerDetalhes = async (item: ItemPedido) => {
    try {
      const detalhes = await obterDetalhesPedido(item.numero_pedido, item.integration_account_id);
      setItemSelecionado(item);
      setModalDetalhes(true);
      toast({
        title: "Detalhes carregados",
        description: `Pedido #${item.numero_pedido} - ${item.nome_cliente}`,
      });
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleEditarPedido = (item: ItemPedido) => {
    setItemSelecionado(item);
    setModalEdicao(true);
  };

  const handleProcessarPedido = (item: ItemPedido) => {
    setItemSelecionado(item);
    setModalProcessamento(true);
  };

  const handleSalvarEdicao = async (itemEditado: Partial<ItemPedido>) => {
    if (!itemEditado.id) return;
    await editarItem(itemEditado);
    setModalEdicao(false);
    setItemSelecionado(null);
  };

  const handleFinalizarProcessamento = async (itemProcessado: ItemPedido) => {
    await processarItem(itemProcessado);
    setModalProcessamento(false);
    setItemSelecionado(null);
  };

  const handleBaixarEstoque = async () => {
    if (processandoBaixaEstoque) return; // Evitar cliques múltiplos
    
    try {
      setProcessandoBaixaEstoque(true);
      
      // Toast de início do processo
      toast({
        title: "Iniciando baixa de estoque",
        description: "Processando itens...",
      });

      // Preferir processar os itens selecionados quando houver seleção explícita
      const baseParaProcessar = itensSelecionados.length > 0 ? itensSelecionados : itensEnriquecidos;

      // Filtrar itens válidos apenas por mapeamento/sku e estoque suficiente
      const itensComEstoque = baseParaProcessar.filter(item => {
        const skuProduto = item.mapeamento_aplicado?.sku_simples || item.sku; // usa mapeamento quando existir
        if (!skuProduto) return false;
        const estoqueAtual = estoqueDisponivel[skuProduto] || 0;
        const quantidadeNecessaria = (item.mapeamento_aplicado?.quantidade || item.qtd_kit || 1) * (item.quantidade || 1);
        return estoqueAtual >= quantidadeNecessaria;
      });

      if (itensComEstoque.length === 0) {
        const itensSemEstoque = itensEnriquecidos.filter(item => {
          const statusEstoque = obterStatusEstoque(item);
          return statusEstoque === 'sem-estoque';
        }).length;
        
        toast({
          title: "Aviso",
          description: itensSemEstoque > 0 
            ? `${itensSemEstoque} itens sem estoque suficiente. Verifique os produtos em vermelho.`
            : "Nenhum item disponível para processar.",
          variant: "destructive",
        });
        return;
      }

      // Processar baixa de estoque
      const { data, error } = await supabase.functions.invoke('processar-baixa-estoque', {
        body: { 
          itens: itensComEstoque.map(item => ({
            id: item.id,
            numero_pedido: item.numero_pedido,
            sku_pedido: item.sku,
            sku_kit: item.mapeamento_aplicado?.sku_simples || item.sku,
            quantidade_kit: (item.mapeamento_aplicado?.quantidade || 1) * item.quantidade,
            quantidade_pedido: item.quantidade,
            qtd_kit: item.mapeamento_aplicado?.quantidade || 1,
            descricao: item.descricao,
            nome_cliente: item.nome_cliente,
            data_pedido: item.data_pedido,
            valor_total: item.valor_total || (item.valor_unitario * item.quantidade),
            valor_unitario: item.valor_unitario,
            numero_ecommerce: item.numero_ecommerce,
            situacao: item.situacao,
            cidade: item.cidade,
            uf: item.uf,
            cpf_cnpj: item.cpf_cnpj,
            // Campos adicionais para completar o histórico
            pedido_id: item.pedido_id,
            ncm: item.ncm,
            codigo_barras: item.codigo_barras,
            valor_frete: item.valor_frete,
            valor_desconto: item.valor_desconto,
            data_prevista: item.data_prevista,
            obs: item.obs,
            obs_interna: item.obs_interna,
            url_rastreamento: item.url_rastreamento,
            codigo_rastreamento: item.codigo_rastreamento,
            integration_account_id: item.integration_account_id,
          }))
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Baixa de estoque realizada",
        description: `${itensComEstoque.length} itens processados com sucesso.`,
      });

      // Recarregar dados para mostrar status atualizado
      await recarregarDados();
      
      // Atualizar estoque disponível
      await verificarEstoqueDisponivel();

    } catch (err) {
      console.error('Erro ao processar baixa de estoque:', err);
      toast({
        title: "Erro",
        description: "Erro ao processar baixa de estoque. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setProcessandoBaixaEstoque(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header - Permite scroll */}
      <div className="bg-background border-b">
        <div className="max-w-7xl px-4 py-2 space-y-2">
          {/* Controles Principais e Cards */}
          <div className="flex items-center justify-between gap-6">
            {/* Resumo Executivo - Cards Compactos */}
            <div className="grid grid-cols-3 gap-3 flex-1 max-w-2xl">
              <DashboardMiniPedidos 
                itens={itensEnriquecidos}
                obterStatusEstoque={obterStatusEstoque}
              />
              {/* Card Total */}
              <div className="bg-card border rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold">{itensEnriquecidos.length}</div>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            <PedidosControleSincronizacao
              onSincronizar={recarregarDados}
              loading={loading}
              ultimaSincronizacao={new Date().toISOString()}
            />
          </div>


          {/* Filtros e Pesquisa */}
          {(filtros.fonte === 'mercadolivre' || filtros.fonte === 'ambas') && (
            <div className="max-w-3xl mb-2">
              <Label>Conta Mercado Livre</Label>
              <Select value={mlContaId} onValueChange={setMlContaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as contas</SelectItem>
                  {contasML.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name || c.account_identifier || c.cnpj || c.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <FiltrosAvancadosPedidos
            filtros={filtros}
            onFiltroChange={atualizarFiltros}
            onLimparFiltros={limparFiltros}
            onBuscarPedidos={handleBuscarPedidos}
            loading={loading || mlLoading}
          />

          {/* Barra de Status - Limitada em largura */}
          <div className="max-w-3xl">
            <PedidosBarraStatus metricas={metricas} />
          </div>

          {/* Ações de Lote */}
          <PedidosBarraAcoes
            itens={itensEnriquecidos}
            itensSelecionados={itensSelecionados}
            obterStatusEstoque={obterStatusEstoque}
            processandoBaixaEstoque={processandoBaixaEstoque}
            onBaixarEstoqueLote={async (itens) => {
              setProcessandoBaixaEstoque(true);
              try {
                await supabase.functions.invoke('processar-baixa-estoque', {
                  body: { itens: itens.map(item => ({
                    id: item.id,
                    numero_pedido: item.numero_pedido,
                    sku_pedido: item.sku,
                    sku_kit: item.mapeamento_aplicado?.sku_simples || item.sku,
                    quantidade_kit: (item.mapeamento_aplicado?.quantidade || 1) * item.quantidade,
                    quantidade_pedido: item.quantidade,
                    qtd_kit: item.mapeamento_aplicado?.quantidade || 1,
                    descricao: item.descricao,
                    nome_cliente: item.nome_cliente,
                    data_pedido: item.data_pedido,
                    valor_total: item.valor_total || (item.valor_unitario * item.quantidade),
                    valor_unitario: item.valor_unitario,
                    numero_ecommerce: item.numero_ecommerce,
                    situacao: item.situacao,
                    cidade: item.cidade,
                    uf: item.uf,
                    cpf_cnpj: item.cpf_cnpj,
                    // Campos adicionais para completar o histórico
                    pedido_id: item.pedido_id,
                    ncm: item.ncm,
                    codigo_barras: item.codigo_barras,
                    valor_frete: item.valor_frete,
                    valor_desconto: item.valor_desconto,
                    data_prevista: item.data_prevista,
                    obs: item.obs,
                    obs_interna: item.obs_interna,
                    url_rastreamento: item.url_rastreamento,
                    codigo_rastreamento: item.codigo_rastreamento,
                    integration_account_id: item.integration_account_id,
                  }))},
                });
                await recarregarDados();
                await verificarEstoqueDisponivel();
                toast({ title: "Baixa em lote realizada", description: `${itens.length} itens processados.` });
              } catch (error) {
                toast({ title: "Erro", description: "Erro ao processar lote.", variant: "destructive" });
              } finally {
                setProcessandoBaixaEstoque(false);
              }
            }}
          />
        </div>
      </div>

      {/* Área da Tabela - Scroll normal com sticky header */}
      <div className="bg-background">
        <div className="max-w-7xl px-4 py-2">
          <PedidosTabelaAvancada
                itens={itensEnriquecidos.slice((paginaAtual - 1) * 100, paginaAtual * 100)}
                itensSelecionados={itensSelecionados}
                onSelecaoChange={setItensSelecionados}
                loading={loading}
                paginaAtual={paginaAtual}
                totalPaginas={totalPaginas}
                totalItens={totalItens}
                itemInicial={itemInicial}
                itemFinal={itemFinal}
                onPaginaChange={irParaPagina}
                onProximaPagina={proximaPagina}
                onPaginaAnterior={paginaAnterior}
                onVerDetalhes={handleVerDetalhes}
                onEditarPedido={handleEditarPedido}
                onProcessarPedido={handleProcessarPedido}
            obterStatusEstoque={obterStatusEstoque}
          />
        </div>
      </div>

      {/* Modais */}
      <PedidoDetalhesModal
        open={modalDetalhes}
        onOpenChange={setModalDetalhes}
        item={itemSelecionado}
      />

      <PedidoEditModal
        open={modalEdicao}
        onOpenChange={setModalEdicao}
        item={itemSelecionado}
        onSalvar={handleSalvarEdicao}
      />

      <PedidoProcessamentoModal
        open={modalProcessamento}
        onOpenChange={setModalProcessamento}
        item={itemSelecionado}
        onProcessar={handleFinalizarProcessamento}
      />
    </div>
  );
}
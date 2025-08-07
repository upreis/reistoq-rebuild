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
import { Download, TrendingDown, Loader2 } from "lucide-react";

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
    clienteVip: false
  };

  const atualizarFiltros = (novosFiltros: Partial<FiltrosAvancados>) => {
    // Converter de volta para o formato original
    const filtrosOriginais = {
      busca: novosFiltros.busca || filtros.busca,
      dataInicio: novosFiltros.dataInicio || filtros.dataInicio,
      dataFinal: novosFiltros.dataFinal || filtros.dataFinal,
      situacoes: novosFiltros.situacoes || filtros.situacoes
    };
    atualizarFiltrosBase(filtrosOriginais);
  };

  const { enriquecerItensPedidos } = useDeParaIntegration();
  
  // Estados dos modais
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [modalEdicao, setModalEdicao] = useState(false);
  const [modalProcessamento, setModalProcessamento] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<ItemPedido | null>(null);
  const [processandoBaixaEstoque, setProcessandoBaixaEstoque] = useState(false);
  const [estoqueDisponivel, setEstoqueDisponivel] = useState<Record<string, number>>({});
  const [itensSelecionados, setItensSelecionados] = useState<ItemPedidoEnriquecido[]>([]);

  // Enriquecer itens com dados do DE/PARA
  const itensEnriquecidos = enriquecerItensPedidos(itens);

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
  } = usePedidosPaginado({ pedidos: itens });

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

      // Executar busca normal
      buscarComFiltros();
      toast({
        title: "Buscando pedidos",
        description: "Os pedidos estão sendo carregados com os filtros aplicados.",
      });
    } catch (error) {
      console.error('Erro ao iniciar busca:', error);
      buscarComFiltros(); // Executa mesmo com erro no controle
      toast({
        title: "Buscando pedidos",
        description: "Os pedidos estão sendo carregados com os filtros aplicados.",
      });
    }
  };


  const handleVerDetalhes = async (item: ItemPedido) => {
    try {
      const detalhes = await obterDetalhesPedido(item.numero_pedido);
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

      // ✅ CORRIGIDO: Filtrar itens com sku_kit válido
      const itensComEstoque = itensEnriquecidos.filter(item => {
        const temSkuKit = item.sku_kit || item.sku;
        const temQuantidade = item.qtd_kit && item.qtd_kit > 0;
        
        // Verificar se está em situação de baixar estoque
        const situacaoLower = item.situacao?.toLowerCase() || '';
        const situacoesBaixarEstoque = [
          'aprovado', 
          'preparando envio', 
          'faturado', 
          'pronto para envio',
          'em separacao',
          'entregue'  // Adicionado para permitir teste com pedidos entregues
        ];
        
        // Não processar se já foi baixado
        const jaProcessado = item.ja_processado;
        
        // ✅ CORRIGIDO: Verificar estoque usando sku_kit
        const skuProduto = item.sku_kit || item.sku;
        const estoqueAtual = estoqueDisponivel[skuProduto || ''] || 0;
        const quantidadeNecessaria = (item.qtd_kit || 1) * item.quantidade;
        const temEstoque = estoqueAtual >= quantidadeNecessaria;
        
        return temSkuKit && (temQuantidade || item.quantidade > 0) && 
               situacoesBaixarEstoque.includes(situacaoLower) && !jaProcessado && temEstoque;
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
            codigo_rastreamento: item.codigo_rastreamento
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
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Área Fixa Superior - Ultra Compacta */}
      <div className="flex-none bg-background border-b">
        <div className="px-6 py-2 space-y-2">
          {/* Header Ultra Compacto */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">Pedidos</h1>
              <p className="text-xs text-muted-foreground">Gestão completa de pedidos</p>
            </div>
            <div className="flex items-center gap-2">
              <PedidosControleSincronizacao
                onSincronizar={recarregarDados}
                loading={loading}
                ultimaSincronizacao={new Date().toISOString()}
              />
            </div>
          </div>

          {/* Cards Compactos em linha única */}
          <div className="grid grid-cols-2 gap-2">
            <DashboardMiniPedidos 
              itens={itensEnriquecidos}
              obterStatusEstoque={obterStatusEstoque}
            />
          </div>

          {/* Filtros Compactos */}
          <div className="space-y-1">
            <FiltrosAvancadosPedidos
              filtros={filtros}
              onFiltroChange={atualizarFiltros}
              onLimparFiltros={limparFiltros}
              onBuscarPedidos={handleBuscarPedidos}
              loading={loading}
            />

            {/* Barra de Status abaixo dos filtros */}
            <PedidosBarraStatus metricas={metricas} />

            <div className="flex items-center justify-between">
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
                        codigo_rastreamento: item.codigo_rastreamento
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
        </div>
      </div>

      {/* Área da Tabela com Scroll Horizontal Independente */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-x-auto overflow-y-auto">
          <div className="min-w-max">
            <div className="px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-4">
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
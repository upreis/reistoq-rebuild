import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useItensPedidos, type ItemPedido } from "@/hooks/useItensPedidos";
import { usePedidosPaginado } from "@/hooks/usePedidosPaginado";
import { useDeParaIntegration } from "@/hooks/useDeParaIntegration";
import { PedidosMetricas } from "@/components/pedidos/PedidosMetricas";
import { PedidosFiltrosCompactos } from "@/components/pedidos/PedidosFiltrosCompactos";
import { PedidosTabelaItens } from "@/components/pedidos/PedidosTabelaItens";
import { PedidosControleSincronizacao } from "@/components/pedidos/PedidosControleSincronizacao";
import { PedidoDetalhesModal } from "@/components/pedidos/PedidoDetalhesModal";
import { PedidoEditModal } from "@/components/pedidos/PedidoEditModal";
import { PedidoProcessamentoModal } from "@/components/pedidos/PedidoProcessamentoModal";
import { Button } from "@/components/ui/button";
import { Download, TrendingDown } from "lucide-react";

export function Pedidos() {
  const {
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
  } = useItensPedidos();

  const { enriquecerItensPedidos } = useDeParaIntegration();
  
  // Estados dos modais
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [modalEdicao, setModalEdicao] = useState(false);
  const [modalProcessamento, setModalProcessamento] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<ItemPedido | null>(null);

  // Enriquecer itens com dados do DE/PARA
  const itensEnriquecidos = enriquecerItensPedidos(itens);

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

  const handleBuscarPedidos = () => {
    buscarComFiltros();
    toast({
      title: "Buscando pedidos",
      description: "Os pedidos estão sendo carregados com os filtros aplicados.",
    });
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
    try {
      // Filtrar apenas itens que têm mapeamento e estão em situação de baixar estoque
      const itensComMapeamento = itensEnriquecidos.filter(item => {
        const temMapeamento = item.mapeamento_aplicado?.sku_correspondente || item.mapeamento_aplicado?.sku_simples;
        const temQuantidade = item.mapeamento_aplicado?.quantidade && item.mapeamento_aplicado.quantidade > 0;
        
        // Verificar se está em situação de baixar estoque
        const situacaoLower = item.situacao?.toLowerCase() || '';
        const situacoesBaixarEstoque = [
          'aprovado', 
          'preparando envio', 
          'faturado', 
          'pronto para envio',
          'em separacao'
        ];
        
        // Não processar se já foi baixado
        const jaProcessado = item.ja_processado;
        
        return temMapeamento && (temQuantidade || item.quantidade > 0) && 
               situacoesBaixarEstoque.includes(situacaoLower) && !jaProcessado;
      });

      if (itensComMapeamento.length === 0) {
        toast({
          title: "Aviso",
          description: "Nenhum item com mapeamento encontrado para processar.",
          variant: "destructive",
        });
        return;
      }

      // Processar baixa de estoque
      const { data, error } = await supabase.functions.invoke('processar-baixa-estoque', {
        body: { 
          itens: itensComMapeamento.map(item => ({
            id: item.id,
            numero_pedido: item.numero_pedido,
            sku_pedido: item.sku,
            sku_kit: item.mapeamento_aplicado?.sku_correspondente || item.mapeamento_aplicado?.sku_simples,
            quantidade_kit: item.mapeamento_aplicado?.quantidade || item.quantidade,
            quantidade_pedido: item.quantidade,
            descricao: item.descricao,
            nome_cliente: item.nome_cliente,
            data_pedido: item.data_pedido,
            valor_total: item.valor_total
          }))
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Baixa de estoque realizada",
        description: `${itensComMapeamento.length} itens processados com sucesso.`,
      });

      // Recarregar dados para mostrar status atualizado
      await recarregarDados();

    } catch (err) {
      console.error('Erro ao processar baixa de estoque:', err);
      toast({
        title: "Erro",
        description: "Erro ao processar baixa de estoque. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">Pedidos</h1>
          <p className="text-muted-foreground">Gestão completa de pedidos</p>
        </div>
        <div className="lg:max-w-md">
          <PedidosControleSincronizacao
            onSincronizar={recarregarDados}
            loading={loading}
            ultimaSincronizacao={new Date().toISOString()}
          />
        </div>
      </div>

      {/* Métricas */}
      <PedidosMetricas metricas={metricas} />

      {/* Filtros */}
      <PedidosFiltrosCompactos
        filtros={filtros}
        onFiltroChange={atualizarFiltros}
        onLimparFiltros={limparFiltros}
        onBuscarPedidos={handleBuscarPedidos}
        loading={loading}
      />

      {/* Botão Baixar Estoque - só aparece quando há itens carregados */}
      {itens.length > 0 && (() => {
        const itensComMapeamento = itensEnriquecidos.filter(item => {
          const temMapeamento = item.mapeamento_aplicado?.sku_correspondente || item.mapeamento_aplicado?.sku_simples;
          const temQuantidade = item.mapeamento_aplicado?.quantidade && item.mapeamento_aplicado.quantidade > 0;
          
          // Verificar se está em situação de baixar estoque
          const situacaoLower = item.situacao?.toLowerCase() || '';
          const situacoesBaixarEstoque = [
            'aprovado', 
            'preparando envio', 
            'faturado', 
            'pronto para envio',
            'em separacao'
          ];
          
          const jaProcessado = item.ja_processado;
          
          const passouFiltro = temMapeamento && (temQuantidade || item.quantidade > 0) && 
                 situacoesBaixarEstoque.includes(situacaoLower) && !jaProcessado;
          
          // Debug detalhado
          console.log(`[DEBUG BOTÃO] Item ${item.sku}:`, {
            temMapeamento: !!temMapeamento,
            skuCorresp: item.mapeamento_aplicado?.sku_correspondente,
            skuSimples: item.mapeamento_aplicado?.sku_simples,
            temQuantidade: !!temQuantidade,
            quantidadeMapeamento: item.mapeamento_aplicado?.quantidade,
            quantidadeItem: item.quantidade,
            situacao: item.situacao,
            situacaoLower,
            situacaoValida: situacoesBaixarEstoque.includes(situacaoLower),
            jaProcessado,
            passouFiltro
          });
          
          return passouFiltro;
        });
        
        console.log(`[DEBUG BOTÃO] Total itens: ${itens.length}, Enriquecidos: ${itensEnriquecidos.length}, Com mapeamento: ${itensComMapeamento.length}`);
        
        return (
          <div className="flex justify-end">
            <Button 
              onClick={handleBaixarEstoque}
              variant="default"
              className="gap-2"
              disabled={loading || itensComMapeamento.length === 0}
            >
              <TrendingDown className="h-4 w-4" />
              Baixar Estoque ({itensComMapeamento.length})
            </Button>
          </div>
        );
      })()}

      <PedidosTabelaItens
        itens={itensEnriquecidos.slice((paginaAtual - 1) * 20, paginaAtual * 20)}
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
      />

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
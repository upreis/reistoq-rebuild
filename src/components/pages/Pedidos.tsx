import { toast } from "@/hooks/use-toast";
import { useItensPedidos } from "@/hooks/useItensPedidos";
import { usePedidosPaginado } from "@/hooks/usePedidosPaginado";
import { PedidosMetricas } from "@/components/pedidos/PedidosMetricas";
import { PedidosFiltrosCompactos } from "@/components/pedidos/PedidosFiltrosCompactos";
import { PedidosTabelaItens } from "@/components/pedidos/PedidosTabelaItens";
import { PedidosControleSincronizacao } from "@/components/pedidos/PedidosControleSincronizacao";
import type { ItemPedido } from "@/hooks/useItensPedidos";

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
    obterDetalhesPedido
  } = useItensPedidos();

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
      console.log('Detalhes do pedido:', detalhes);
      toast({
        title: "Detalhes carregados",
        description: `Pedido #${item.numero_pedido} - ${item.nome_cliente}`,
      });
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleEditarPedido = (item: ItemPedido) => {
    // TODO: Implementar modal de edição do pedido
    toast({
      title: "Editar pedido",
      description: `Editando pedido #${item.numero_pedido}`,
    });
  };

  const handleProcessarPedido = (item: ItemPedido) => {
    // TODO: Implementar processamento do pedido
    toast({
      title: "Processar pedido",
      description: `Processando pedido #${item.numero_pedido}`,
    });
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

      <PedidosTabelaItens
        itens={pedidosPaginados}
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

    </div>
  );
}
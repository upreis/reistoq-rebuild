import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useItensPedidos } from "@/hooks/useItensPedidos";
import { usePedidosPaginado } from "@/hooks/usePedidosPaginado";
import { PedidosMetricas } from "@/components/pedidos/PedidosMetricas";
import { PedidosFiltrosCompactos } from "@/components/pedidos/PedidosFiltrosCompactos";
import { PedidosTabelaItens } from "@/components/pedidos/PedidosTabelaItens";
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

  const handleSincronizar = () => {
    recarregarDados();
    toast({
      title: "Sincronização iniciada",
      description: "Os dados dos pedidos estão sendo atualizados.",
    });
  };

  const handleExportar = () => {
    // TODO: Implementar exportação de pedidos
    toast({
      title: "Exportação em desenvolvimento",
      description: "A funcionalidade de exportação será implementada em breve.",
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pedidos</h1>
          <p className="text-muted-foreground">Gestão completa de pedidos - Integração Tiny ERP</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSincronizar} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
          <Button variant="secondary" onClick={handleExportar}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <PedidosMetricas metricas={metricas} />

      {/* Filtros */}
      <PedidosFiltrosCompactos
        filtros={filtros}
        onFiltroChange={atualizarFiltros}
        onLimparFiltros={limparFiltros}
      />

      {/* Tabela de Itens de Pedidos */}
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

      {/* Status da Integração */}
      <Card>
        <CardHeader>
          <CardTitle>Status da Integração Tiny ERP</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Última sincronização: há 5 minutos</p>
              <p className="text-sm font-medium text-foreground">Conectado e funcionando</p>
            </div>
            <Badge variant="default">Online</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
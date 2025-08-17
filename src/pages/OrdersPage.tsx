import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

// Hooks
import { useOrders } from "@/hooks/useOrders";
import { useOrderExport } from "@/hooks/useOrderExport";
import { useBulkStock } from "@/hooks/useBulkStock";

// Components
import { OrdersFilters } from "@/components/orders/OrdersFilters";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { BulkActionsBar } from "@/components/orders/BulkActionsBar";
import { OrderDetailsModal } from "@/components/orders/OrderDetailsModal";
import { OrderEditModal } from "@/components/orders/OrderEditModal";
import { OrderProcessModal } from "@/components/orders/OrderProcessModal";

// Types
import type { OrderItem } from "@/types/orders";

export default function OrdersPage() {
  // State para modais
  const [detailsModal, setDetailsModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [processModal, setProcessModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkStockConfirm, setBulkStockConfirm] = useState(false);

  // Hooks
  const {
    orders,
    metrics,
    loading,
    error,
    filters,
    updateFilters,
    updateSearch,
    clearFilters,
    refetch
  } = useOrders();

  const { exportToCsv, exporting } = useOrderExport();
  
  const {
    processing: stockProcessing,
    stockLevels,
    checkStockLevels,
    getStockStatus,
    getEligibleItems,
    processBulkStock
  } = useBulkStock();

  // Verificar estoque quando pedidos carregarem
  useEffect(() => {
    if (orders.length > 0) {
      checkStockLevels(orders);
    }
  }, [orders.length, checkStockLevels]);

  // Auto-selecionar itens elegíveis
  useEffect(() => {
    if (orders.length > 0 && Object.keys(stockLevels).length > 0) {
      const eligible = getEligibleItems(orders);
      setSelectedItems(eligible.map(item => item.id));
    }
  }, [orders.length, stockLevels, getEligibleItems]);

  // Handlers para modais
  const handleViewDetails = (order: OrderItem) => {
    setSelectedOrder(order);
    setDetailsModal(true);
  };

  const handleEdit = (order: OrderItem) => {
    setSelectedOrder(order);
    setEditModal(true);
  };

  const handleProcess = (order: OrderItem) => {
    setSelectedOrder(order);
    setProcessModal(true);
  };

  const handleSaveEdit = async (updatedOrder: Partial<OrderItem>) => {
    try {
      // Aqui seria a chamada para salvar via API
      // Por ora, simular sucesso
      console.log('Salvando pedido editado:', updatedOrder);
      
      toast({
        title: "Pedido atualizado",
        description: "As alterações foram salvas com sucesso"
      });
      
      // Recarregar dados
      await refetch();
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao salvar pedido');
    }
  };

  const handleProcessOrder = async (processedOrder: OrderItem) => {
    try {
      // Aqui seria a chamada para processar via API
      console.log('Processando pedido:', processedOrder);
      
      toast({
        title: "Pedido processado",
        description: `Pedido #${processedOrder.numero_pedido} foi processado`
      });
      
      // Recarregar dados
      await refetch();
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao processar pedido');
    }
  };

  // Export
  const handleExport = async () => {
    try {
      const selectedOrders = orders.filter(order => selectedItems.includes(order.id));
      const ordersToExport = selectedOrders.length > 0 ? selectedOrders : orders;
      
      await exportToCsv({
        ...filters,
        pageSize: ordersToExport.length
      });
    } catch (error: any) {
      console.error('Erro no export:', error);
    }
  };

  // Baixa de estoque
  const handleBulkStock = () => {
    const eligibleCount = getEligibleItems(orders.filter(o => selectedItems.includes(o.id))).length;
    if (eligibleCount > 0) {
      setBulkStockConfirm(true);
    }
  };

  const confirmBulkStock = async () => {
    try {
      const selectedOrders = orders.filter(order => selectedItems.includes(order.id));
      await processBulkStock(selectedOrders);
      
      // Recarregar dados após processamento
      await refetch();
      await checkStockLevels(orders);
      
      setBulkStockConfirm(false);
    } catch (error: any) {
      console.error('Erro na baixa de estoque:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pedidos</h1>
        <p className="text-muted-foreground">
          Gerencie pedidos, acompanhe status e processe baixas de estoque
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalItens}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalPedidos} pedidos únicos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pedidosPendentes}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando aprovação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pedidosEntregues}</div>
            <p className="text-xs text-muted-foreground">
              Concluídos com sucesso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                notation: 'compact'
              }).format(metrics.valorTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              Período selecionado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <OrdersFilters
        filters={filters}
        onFiltersChange={updateFilters}
        onSearchChange={updateSearch}
        onClear={clearFilters}
      />

      <Separator />

      {/* Barra de ações */}
      <BulkActionsBar
        orders={orders}
        selectedItems={selectedItems}
        getStockStatus={getStockStatus}
        processing={stockProcessing || exporting}
        onExport={handleExport}
        onBulkStock={handleBulkStock}
      />

      {/* Tabela */}
      <OrdersTable
        orders={orders}
        loading={loading}
        filters={filters}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        onFiltersChange={updateFilters}
        onViewDetails={handleViewDetails}
        onEdit={handleEdit}
        onProcess={handleProcess}
        getStockStatus={getStockStatus}
      />

      {/* Modais */}
      <OrderDetailsModal
        isOpen={detailsModal}
        onClose={() => setDetailsModal(false)}
        order={selectedOrder}
      />

      <OrderEditModal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        order={selectedOrder}
        onSave={handleSaveEdit}
      />

      <OrderProcessModal
        isOpen={processModal}
        onClose={() => setProcessModal(false)}
        order={selectedOrder}
        onProcess={handleProcessOrder}
      />

      {/* Confirmação de baixa de estoque */}
      <AlertDialog open={bulkStockConfirm} onOpenChange={setBulkStockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar baixa de estoque</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá dar baixa no estoque dos produtos selecionados.
              {getEligibleItems(orders.filter(o => selectedItems.includes(o.id))).length > 0 && (
                <>
                  <br /><br />
                  <strong>
                    {getEligibleItems(orders.filter(o => selectedItems.includes(o.id))).length} itens 
                  </strong> serão processados.
                </>
              )}
              <br /><br />
              Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkStock}>
              Confirmar baixa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
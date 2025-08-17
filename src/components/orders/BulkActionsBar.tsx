import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Download, TrendingDown, Loader2 } from "lucide-react";
import type { OrderItem } from "@/types/orders";

interface BulkActionsBarProps {
  orders: OrderItem[];
  selectedItems: string[];
  getStockStatus?: (item: OrderItem) => 'disponivel' | 'sem-estoque' | 'sem-mapeamento' | 'processado' | 'processando';
  processing: boolean;
  onExport: () => void;
  onBulkStock: () => void;
}

export function BulkActionsBar({
  orders,
  selectedItems,
  getStockStatus,
  processing,
  onExport,
  onBulkStock
}: BulkActionsBarProps) {

  if (orders.length === 0) {
    return null;
  }

  const selectedOrders = orders.filter(order => selectedItems.includes(order.id));
  const eligibleForStock = selectedOrders.filter(order => {
    if (!getStockStatus) return false;
    return getStockStatus(order) === 'disponivel';
  });

  const totalOrders = new Set(orders.map(order => order.numero_pedido)).size;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              <Badge variant="outline" className="mr-2">
                {totalOrders} pedidos
              </Badge>
              <Badge variant="secondary" className="mr-2">
                {selectedItems.length} selecionados
              </Badge>
              {eligibleForStock.length > 0 && (
                <Badge variant="default">
                  {eligibleForStock.length} prontos para baixa
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              disabled={orders.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>

            {eligibleForStock.length > 0 && (
              <Button
                size="sm"
                onClick={onBulkStock}
                disabled={processing || eligibleForStock.length === 0}
              >
                {processing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TrendingDown className="mr-2 h-4 w-4" />
                )}
                Baixar Estoque ({eligibleForStock.length})
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
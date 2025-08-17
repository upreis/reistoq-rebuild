import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { orderService } from "@/services/OrderService";
import type { OrderItem, OrderDetails } from "@/types/orders";

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderItem | null;
}

export function OrderDetailsModal({
  isOpen,
  onClose,
  order
}: OrderDetailsModalProps) {
  const [details, setDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && order) {
      loadDetails();
    }
  }, [isOpen, order]);

  const loadDetails = async () => {
    if (!order) return;

    try {
      setLoading(true);
      const orderDetails = await orderService.details(order.numero_pedido);
      setDetails(orderDetails);
    } catch (error: any) {
      console.error('Erro ao carregar detalhes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes do pedido",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Detalhes do Pedido #{order.numero_pedido}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Informações básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-3">Informações do Pedido</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Número:</span>
                    <span className="font-medium">{order.numero_pedido}</span>
                  </div>
                  {order.numero_ecommerce && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">E-commerce:</span>
                      <span className="font-medium">{order.numero_ecommerce}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data:</span>
                    <span>{formatDate(order.data_pedido)}</span>
                  </div>
                  {order.data_prevista && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Previsão:</span>
                      <span>{formatDate(order.data_prevista)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge>{order.situacao}</Badge>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Cliente</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nome:</span>
                    <span className="font-medium">{order.nome_cliente}</span>
                  </div>
                  {order.cpf_cnpj && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CPF/CNPJ:</span>
                      <span>{order.cpf_cnpj}</span>
                    </div>
                  )}
                  {order.cidade && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cidade:</span>
                      <span>{order.cidade} - {order.uf}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Item do pedido */}
            <div>
              <h3 className="font-semibold mb-3">Item</h3>
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{order.descricao}</p>
                    <p className="text-sm text-muted-foreground">SKU: {order.sku}</p>
                    {order.codigo_barras && (
                      <p className="text-sm text-muted-foreground">
                        Código de barras: {order.codigo_barras}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(order.valor_total)}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.quantidade}x {formatCurrency(order.valor_unitario)}
                    </p>
                  </div>
                </div>
                
                {order.observacoes && (
                  <div>
                    <p className="text-sm font-medium">Observações:</p>
                    <p className="text-sm text-muted-foreground">{order.observacoes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Valores do pedido */}
            <div>
              <h3 className="font-semibold mb-3">Valores</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(order.valor_total)}</span>
                </div>
                {order.valor_frete > 0 && (
                  <div className="flex justify-between">
                    <span>Frete:</span>
                    <span>{formatCurrency(order.valor_frete)}</span>
                  </div>
                )}
                {order.valor_desconto > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Desconto:</span>
                    <span>-{formatCurrency(order.valor_desconto)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>{formatCurrency(order.valor_total + order.valor_frete - order.valor_desconto)}</span>
                </div>
              </div>
            </div>

            {/* Rastreamento */}
            {order.codigo_rastreamento && (
              <div>
                <h3 className="font-semibold mb-3">Rastreamento</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Código:</span>
                    <span className="font-medium">{order.codigo_rastreamento}</span>
                  </div>
                  {order.url_rastreamento && (
                    <div>
                      <a 
                        href={order.url_rastreamento} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Acompanhar pedido
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Observações */}
            {(order.obs || order.obs_interna) && (
              <div>
                <h3 className="font-semibold mb-3">Observações</h3>
                <div className="space-y-3">
                  {order.obs && (
                    <div>
                      <p className="text-sm font-medium">Observações do pedido:</p>
                      <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                        {order.obs}
                      </p>
                    </div>
                  )}
                  {order.obs_interna && (
                    <div>
                      <p className="text-sm font-medium">Observações internas:</p>
                      <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                        {order.obs_interna}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timeline se disponível */}
            {details?.timeline && details.timeline.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Histórico</h3>
                <div className="space-y-3">
                  {details.timeline.map((event, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.status}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(event.data)}
                        </p>
                        {event.observacao && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {event.observacao}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, AlertCircle, Package } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { OrderItem } from "@/types/orders";

interface OrderProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderItem | null;
  onProcess: (processedOrder: OrderItem) => Promise<void>;
}

export function OrderProcessModal({
  isOpen,
  onClose,
  order,
  onProcess
}: OrderProcessModalProps) {
  const [novoStatus, setNovoStatus] = useState<string>('Preparando Envio');
  const [observacoes, setObservacoes] = useState('');
  const [processing, setProcessing] = useState(false);

  const statusOptions = [
    'Preparando Envio',
    'Faturado', 
    'Pronto para Envio',
    'Enviado'
  ];

  const handleProcess = async () => {
    if (!order) return;

    try {
      setProcessing(true);

      const processedOrder: OrderItem = {
        ...order,
        situacao: novoStatus as any,
        obs_interna: observacoes ? 
          `${order.obs_interna || ''}\n[${new Date().toLocaleDateString('pt-BR')}] ${observacoes}`.trim() 
          : order.obs_interna
      };

      await onProcess(processedOrder);

      toast({
        title: "Pedido processado",
        description: `Pedido #${order.numero_pedido} processado para "${novoStatus}"`
      });

      onClose();
      
      // Reset form
      setNovoStatus('Preparando Envio');
      setObservacoes('');
    } catch (error: any) {
      console.error('Erro ao processar:', error);
      toast({
        title: "Erro ao processar",
        description: error.message || "Erro inesperado ao processar pedido",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  if (!order) return null;

  const canProcess = order.situacao === 'Aprovado';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Processar Pedido #{order.numero_pedido}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status atual */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Status atual</Label>
              <Badge variant={canProcess ? "default" : "secondary"}>
                {order.situacao}
              </Badge>
            </div>
            
            {canProcess ? (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Pedido pode ser processado
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-orange-600">
                <AlertCircle className="h-4 w-4" />
                Apenas pedidos "Aprovado" podem ser processados
              </div>
            )}
          </div>

          {/* Informações do pedido */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <p className="text-sm font-medium">{order.nome_cliente}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Valor total</Label>
              <p className="text-sm font-medium">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(order.valor_total)}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">SKU</Label>
              <p className="text-sm font-mono">{order.sku}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Quantidade</Label>
              <p className="text-sm">{order.quantidade}</p>
            </div>
          </div>

          <Separator />

          {canProcess && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="novo_status">Novo status</Label>
                <Select
                  value={novoStatus}
                  onValueChange={setNovoStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(status => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="observacoes">Observações do processamento</Label>
                <Textarea
                  id="observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Adicione observações sobre o processamento..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Essas observações serão adicionadas às observações internas do pedido
                </p>
              </div>
            </div>
          )}

          {/* Etapas do processamento */}
          <div>
            <Label className="text-sm font-medium">Próximas etapas</Label>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${novoStatus === 'Preparando Envio' ? 'bg-blue-500' : 'bg-muted'}`} />
                Separação dos produtos
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${novoStatus === 'Faturado' ? 'bg-blue-500' : 'bg-muted'}`} />
                Faturamento
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${novoStatus === 'Pronto para Envio' ? 'bg-blue-500' : 'bg-muted'}`} />
                Embalagem e etiquetagem
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${novoStatus === 'Enviado' ? 'bg-green-500' : 'bg-muted'}`} />
                Envio
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={processing}>
            Cancelar
          </Button>
          <Button 
            onClick={handleProcess} 
            disabled={processing || !canProcess}
          >
            {processing ? "Processando..." : `Processar para "${novoStatus}"`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import type { OrderItem, OrderStatus } from "@/types/orders";

const STATUS_OPTIONS: OrderStatus[] = [
  'Em Aberto',
  'Aprovado', 
  'Preparando Envio',
  'Faturado',
  'Pronto para Envio',
  'Enviado',
  'Entregue',
  'Nao Entregue',
  'Cancelado'
];

interface OrderEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderItem | null;
  onSave: (updatedOrder: Partial<OrderItem>) => Promise<void>;
}

export function OrderEditModal({
  isOpen,
  onClose,
  order,
  onSave
}: OrderEditModalProps) {
  const [formData, setFormData] = useState<Partial<OrderItem>>({});
  const [saving, setSaving] = useState(false);

  // Inicializar formulário quando modal abrir
  useState(() => {
    if (isOpen && order) {
      setFormData({
        situacao: order.situacao,
        codigo_rastreamento: order.codigo_rastreamento || '',
        url_rastreamento: order.url_rastreamento || '',
        obs: order.obs || '',
        obs_interna: order.obs_interna || '',
        quantidade: order.quantidade,
        valor_unitario: order.valor_unitario,
      });
    }
  });

  const handleSave = async () => {
    if (!order) return;

    try {
      setSaving(true);

      // Validações básicas
      if (formData.quantidade && formData.quantidade <= 0) {
        toast({
          title: "Erro de validação",
          description: "Quantidade deve ser maior que zero",
          variant: "destructive"
        });
        return;
      }

      if (formData.valor_unitario && formData.valor_unitario < 0) {
        toast({
          title: "Erro de validação", 
          description: "Valor unitário não pode ser negativo",
          variant: "destructive"
        });
        return;
      }

      // Recalcular valor total se quantidade ou valor unitário mudaram
      const updatedData = { ...formData };
      if (formData.quantidade !== undefined || formData.valor_unitario !== undefined) {
        const qtd = formData.quantidade ?? order.quantidade;
        const valor = formData.valor_unitario ?? order.valor_unitario;
        updatedData.valor_total = qtd * valor;
      }

      await onSave({
        id: order.id,
        ...updatedData
      });

      toast({
        title: "Pedido atualizado",
        description: `Pedido #${order.numero_pedido} foi atualizado com sucesso`
      });

      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Erro inesperado ao salvar pedido",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Editar Pedido #{order.numero_pedido}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações básicas do pedido (somente leitura) */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <p className="text-sm font-medium">{order.nome_cliente}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Data do pedido</Label>
              <p className="text-sm">{new Date(order.data_pedido).toLocaleDateString('pt-BR')}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">SKU</Label>
              <p className="text-sm font-mono">{order.sku}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Descrição</Label>
              <p className="text-sm">{order.descricao}</p>
            </div>
          </div>

          {/* Campos editáveis */}
          <div className="space-y-4">
            {/* Status */}
            <div>
              <Label htmlFor="situacao">Status do pedido</Label>
              <Select
                value={formData.situacao || order.situacao}
                onValueChange={(value: OrderStatus) => 
                  setFormData(prev => ({ ...prev, situacao: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(status => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantidade e valor */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantidade">Quantidade</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min="1"
                  value={formData.quantidade ?? order.quantidade}
                  onChange={(e) => 
                    setFormData(prev => ({ 
                      ...prev, 
                      quantidade: parseInt(e.target.value) || 0 
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="valor_unitario">Valor unitário</Label>
                <Input
                  id="valor_unitario"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor_unitario ?? order.valor_unitario}
                  onChange={(e) => 
                    setFormData(prev => ({ 
                      ...prev, 
                      valor_unitario: parseFloat(e.target.value) || 0 
                    }))
                  }
                />
              </div>
            </div>

            {/* Rastreamento */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="codigo_rastreamento">Código de rastreamento</Label>
                <Input
                  id="codigo_rastreamento"
                  value={formData.codigo_rastreamento ?? order.codigo_rastreamento ?? ''}
                  onChange={(e) => 
                    setFormData(prev => ({ ...prev, codigo_rastreamento: e.target.value }))
                  }
                  placeholder="Ex: AA123456789BR"
                />
              </div>
              <div>
                <Label htmlFor="url_rastreamento">URL de rastreamento</Label>
                <Input
                  id="url_rastreamento"
                  value={formData.url_rastreamento ?? order.url_rastreamento ?? ''}
                  onChange={(e) => 
                    setFormData(prev => ({ ...prev, url_rastreamento: e.target.value }))
                  }
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="obs">Observações do pedido</Label>
                <Textarea
                  id="obs"
                  value={formData.obs ?? order.obs ?? ''}
                  onChange={(e) => 
                    setFormData(prev => ({ ...prev, obs: e.target.value }))
                  }
                  placeholder="Observações visíveis para o cliente..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="obs_interna">Observações internas</Label>
                <Textarea
                  id="obs_interna"
                  value={formData.obs_interna ?? order.obs_interna ?? ''}
                  onChange={(e) => 
                    setFormData(prev => ({ ...prev, obs_interna: e.target.value }))
                  }
                  placeholder="Observações internas (não visíveis para o cliente)..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
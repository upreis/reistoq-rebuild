import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FEATURES } from '@/config/features';

interface HistoricoVenda {
  id: string;
  id_unico: string;
  numero_pedido: string;
  sku_produto: string;
  nome_produto: string | null;
  quantidade_vendida: number;
  valor_unitario: number;
  valor_total: number;
  cliente_nome: string | null;
  cliente_documento: string | null;
  status: string;
  observacoes: string | null;
  data_venda: string;
  created_at: string;
  updated_at: string;
}

interface VendaEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venda: HistoricoVenda | null;
  onSuccess: () => void;
}

export function VendaEditModal({ open, onOpenChange, venda, onSuccess }: VendaEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    id_unico: '',
    numero_pedido: '',
    sku_produto: '',
    nome_produto: '',
    quantidade_vendida: '',
    valor_unitario: '',
    valor_total: '',
    cliente_nome: '',
    cliente_documento: '',
    status: 'concluida',
    observacoes: '',
    data_venda: '',
  });

  const { toast } = useToast();

  useEffect(() => {
    if (venda) {
      setFormData({
        id_unico: venda.id_unico,
        numero_pedido: venda.numero_pedido,
        sku_produto: venda.sku_produto,
        nome_produto: venda.nome_produto || '',
        quantidade_vendida: venda.quantidade_vendida.toString(),
        valor_unitario: venda.valor_unitario.toString(),
        valor_total: venda.valor_total.toString(),
        cliente_nome: venda.cliente_nome || '',
        cliente_documento: venda.cliente_documento || '',
        status: venda.status,
        observacoes: venda.observacoes || '',
        data_venda: venda.data_venda,
      });
    }
  }, [venda]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!venda || !formData.id_unico || !formData.numero_pedido || !formData.sku_produto) {
      toast({
        title: "Erro de validação",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const quantidade = parseInt(formData.quantidade_vendida) || 0;
      const valorUnitario = parseFloat(formData.valor_unitario) || 0;
      const valorTotal = parseFloat(formData.valor_total) || 0;

      const { error } = await supabase
        .from('historico_vendas')
        .update({
          id_unico: formData.id_unico,
          numero_pedido: formData.numero_pedido,
          sku_produto: formData.sku_produto,
          nome_produto: formData.nome_produto || null,
          quantidade_vendida: quantidade,
          valor_unitario: valorUnitario,
          valor_total: valorTotal,
          cliente_nome: formData.cliente_nome || null,
          cliente_documento: formData.cliente_documento || null,
          status: formData.status,
          observacoes: formData.observacoes || null,
          data_venda: formData.data_venda,
        })
        .eq('id', venda.id);

      if (error) throw error;

      toast({
        title: "Venda atualizada",
        description: "A venda foi atualizada com sucesso.",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao atualizar venda:', error);
      toast({
        title: "Erro ao atualizar venda",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleValorChange = () => {
    const quantidade = parseInt(formData.quantidade_vendida) || 0;
    const valorUnitario = parseFloat(formData.valor_unitario) || 0;
    const valorTotal = quantidade * valorUnitario;
    
    setFormData(prev => ({ ...prev, valor_total: valorTotal.toString() }));
  };

  if (!venda) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Venda</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="id_unico">ID Único *</Label>
              <Input
                id="id_unico"
                value={formData.id_unico}
                onChange={(e) => setFormData(prev => ({ ...prev, id_unico: e.target.value }))}
                placeholder="Identificador único da venda"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="numero_pedido">Número do Pedido *</Label>
              <Input
                id="numero_pedido"
                value={formData.numero_pedido}
                onChange={(e) => setFormData(prev => ({ ...prev, numero_pedido: e.target.value }))}
                placeholder="Ex: PED-12345"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sku_produto">SKU do Produto *</Label>
              <Input
                id="sku_produto"
                value={formData.sku_produto}
                onChange={(e) => setFormData(prev => ({ ...prev, sku_produto: e.target.value }))}
                placeholder="Ex: PROD-001"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="nome_produto">Nome do Produto</Label>
              <Input
                id="nome_produto"
                value={formData.nome_produto}
                onChange={(e) => setFormData(prev => ({ ...prev, nome_produto: e.target.value }))}
                placeholder="Nome descritivo do produto"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quantidade_vendida">Quantidade Vendida</Label>
              <Input
                id="quantidade_vendida"
                type="number"
                min="0"
                value={formData.quantidade_vendida}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, quantidade_vendida: e.target.value }));
                  setTimeout(handleValorChange, 0);
                }}
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="valor_unitario">Valor Unitário</Label>
              <Input
                id="valor_unitario"
                type="number"
                min="0"
                step="0.01"
                value={formData.valor_unitario}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, valor_unitario: e.target.value }));
                  setTimeout(handleValorChange, 0);
                }}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="valor_total">Valor Total</Label>
              <Input
                id="valor_total"
                type="number"
                min="0"
                step="0.01"
                value={formData.valor_total}
                onChange={(e) => setFormData(prev => ({ ...prev, valor_total: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cliente_nome">Nome do Cliente</Label>
              <Input
                id="cliente_nome"
                value={formData.cliente_nome}
                onChange={(e) => setFormData(prev => ({ ...prev, cliente_nome: e.target.value }))}
                placeholder="Nome do cliente"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cliente_documento">Documento do Cliente</Label>
              <Input
                id="cliente_documento"
                value={formData.cliente_documento}
                onChange={(e) => setFormData(prev => ({ ...prev, cliente_documento: e.target.value }))}
                placeholder="CPF/CNPJ"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                  <SelectItem value="processando">Processando</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="data_venda">Data da Venda</Label>
              <Input
                id="data_venda"
                type="date"
                value={formData.data_venda}
                onChange={(e) => setFormData(prev => ({ ...prev, data_venda: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Observações adicionais sobre a venda"
              rows={3}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
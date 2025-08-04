import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ItemPedidoEnriquecido } from '@/hooks/useDeParaIntegration';
import { formatarMoeda } from '@/lib/utils';
import { Edit, Package, User, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PedidoEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemPedidoEnriquecido | null;
  onSalvar?: (itemEditado: Partial<ItemPedidoEnriquecido>) => Promise<void>;
}

export function PedidoEditModal({ 
  open, 
  onOpenChange, 
  item,
  onSalvar 
}: PedidoEditModalProps) {
  const [formData, setFormData] = useState<Partial<ItemPedidoEnriquecido>>({});
  const [loading, setSaving] = useState(false);

  useEffect(() => {
    if (open && item) {
      setFormData({
        id: item.id,
        sku: item.sku,
        descricao: item.descricao,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        valor_total: item.valor_total,
        ncm: item.ncm || '',
        codigo_barras: item.codigo_barras || '',
        observacoes: item.observacoes || '',
        // Campos do pedido
        nome_cliente: item.nome_cliente || '',
        situacao: item.situacao || '',
        obs: item.obs || '',
        obs_interna: item.obs_interna || '',
        codigo_rastreamento: item.codigo_rastreamento || '',
        url_rastreamento: item.url_rastreamento || ''
      });
    }
  }, [open, item]);

  const handleInputChange = (field: keyof ItemPedidoEnriquecido, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Recalcular valor total quando quantidade ou valor unitário mudam
      if (field === 'quantidade' || field === 'valor_unitario') {
        const quantidade = field === 'quantidade' ? value : (updated.quantidade || 0);
        const valorUnitario = field === 'valor_unitario' ? value : (updated.valor_unitario || 0);
        updated.valor_total = quantidade * valorUnitario;
      }
      
      return updated;
    });
  };

  const handleSalvar = async () => {
    if (!onSalvar || !formData.id) {
      toast({
        title: "Erro",
        description: "Dados insuficientes para salvar",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      await onSalvar(formData);
      
      toast({
        title: "Sucesso",
        description: "Pedido atualizado com sucesso",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar alterações",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;

  const situacoes = [
    { value: 'em_aberto', label: 'Em Aberto' },
    { value: 'aprovado', label: 'Aprovado' },
    { value: 'atendido', label: 'Atendido' },
    { value: 'preparando_envio', label: 'Preparando Envio' },
    { value: 'enviado', label: 'Enviado' },
    { value: 'entregue', label: 'Entregue' },
    { value: 'cancelado', label: 'Cancelado' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Pedido #{item.numero_pedido}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nome_cliente">Nome do Cliente</Label>
                <Input
                  id="nome_cliente"
                  value={formData.nome_cliente || ''}
                  onChange={(e) => handleInputChange('nome_cliente', e.target.value)}
                  placeholder="Nome do cliente"
                />
              </div>
            </CardContent>
          </Card>

          {/* Informações do Produto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Informações do Produto
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku || ''}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  placeholder="SKU do produto"
                  className="font-mono"
                />
              </div>

              <div>
                <Label htmlFor="codigo_barras">Código de Barras</Label>
                <Input
                  id="codigo_barras"
                  value={formData.codigo_barras || ''}
                  onChange={(e) => handleInputChange('codigo_barras', e.target.value)}
                  placeholder="Código de barras"
                  className="font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao || ''}
                  onChange={(e) => handleInputChange('descricao', e.target.value)}
                  placeholder="Descrição do produto"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="quantidade">Quantidade</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.quantidade || 0}
                  onChange={(e) => handleInputChange('quantidade', parseInt(e.target.value) || 0)}
                />
              </div>

              <div>
                <Label htmlFor="valor_unitario">Valor Unitário</Label>
                <Input
                  id="valor_unitario"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.valor_unitario || 0}
                  onChange={(e) => handleInputChange('valor_unitario', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div>
                <Label htmlFor="ncm">NCM</Label>
                <Input
                  id="ncm"
                  value={formData.ncm || ''}
                  onChange={(e) => handleInputChange('ncm', e.target.value)}
                  placeholder="Código NCM"
                  className="font-mono"
                />
              </div>

              <div>
                <Label>Valor Total</Label>
                <div className="p-2 bg-muted rounded-md">
                  <span className="font-semibold">
                    {formatarMoeda(formData.valor_total || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status e Rastreamento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Status e Rastreamento
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="situacao">Situação</Label>
                <Select 
                  value={formData.situacao || ''} 
                  onValueChange={(value) => handleInputChange('situacao', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a situação" />
                  </SelectTrigger>
                  <SelectContent>
                    {situacoes.map(situacao => (
                      <SelectItem key={situacao.value} value={situacao.value}>
                        {situacao.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="codigo_rastreamento">Código de Rastreamento</Label>
                <Input
                  id="codigo_rastreamento"
                  value={formData.codigo_rastreamento || ''}
                  onChange={(e) => handleInputChange('codigo_rastreamento', e.target.value)}
                  placeholder="Código de rastreamento"
                  className="font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="url_rastreamento">URL de Rastreamento</Label>
                <Input
                  id="url_rastreamento"
                  type="url"
                  value={formData.url_rastreamento || ''}
                  onChange={(e) => handleInputChange('url_rastreamento', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="observacoes">Observações do Item</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes || ''}
                  onChange={(e) => handleInputChange('observacoes', e.target.value)}
                  placeholder="Observações específicas do item"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="obs">Observações do Pedido</Label>
                <Textarea
                  id="obs"
                  value={formData.obs || ''}
                  onChange={(e) => handleInputChange('obs', e.target.value)}
                  placeholder="Observações gerais do pedido"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="obs_interna">Observações Internas</Label>
                <Textarea
                  id="obs_interna"
                  value={formData.obs_interna || ''}
                  onChange={(e) => handleInputChange('obs_interna', e.target.value)}
                  placeholder="Observações internas (não visíveis ao cliente)"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
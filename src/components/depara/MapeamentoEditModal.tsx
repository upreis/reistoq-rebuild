import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { MapeamentoDePara } from "@/hooks/useDePara";

interface MapeamentoEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapeamento: MapeamentoDePara | null;
  onSuccess: () => void;
}

export function MapeamentoEditModal({ 
  open, 
  onOpenChange, 
  mapeamento, 
  onSuccess 
}: MapeamentoEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    sku_pedido: '',
    sku_correspondente: '',
    sku_simples: '',
    quantidade: 1,
    ativo: true,
    observacoes: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (mapeamento) {
      setFormData({
        sku_pedido: mapeamento.sku_pedido,
        sku_correspondente: mapeamento.sku_correspondente,
        sku_simples: mapeamento.sku_simples || '',
        quantidade: mapeamento.quantidade,
        ativo: mapeamento.ativo,
        observacoes: mapeamento.observacoes || ''
      });
    }
  }, [mapeamento]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sku_pedido.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "SKU do Pedido é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (!mapeamento) return;

    try {
      setLoading(true);

      // Verificar se já existe outro mapeamento com este SKU do pedido (diferente do atual)
      const { data: existente } = await supabase
        .from('mapeamentos_depara')
        .select('id')
        .eq('sku_pedido', formData.sku_pedido.trim())
        .neq('id', mapeamento.id)
        .single();

      if (existente) {
        toast({
          title: "SKU já existe",
          description: "Já existe outro mapeamento para este SKU do pedido.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('mapeamentos_depara')
        .update({
          sku_pedido: formData.sku_pedido.trim(),
          sku_correspondente: formData.sku_correspondente.trim() || null,
          sku_simples: formData.sku_simples.trim() || null,
          quantidade: formData.quantidade,
          ativo: formData.ativo,
          observacoes: formData.observacoes.trim() || null
        })
        .eq('id', mapeamento.id);

      if (error) throw error;

      toast({
        title: "Mapeamento atualizado",
        description: "O mapeamento foi atualizado com sucesso.",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao atualizar mapeamento:', error);
      toast({
        title: "Erro ao atualizar mapeamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Mapeamento</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sku_pedido">SKU Do Pedido *</Label>
            <Input
              id="sku_pedido"
              value={formData.sku_pedido}
              onChange={(e) => handleInputChange('sku_pedido', e.target.value)}
              placeholder="Ex: SKU001-KIT"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku_correspondente">SKU Correto Do Pedido</Label>
            <Input
              id="sku_correspondente"
              value={formData.sku_correspondente}
              onChange={(e) => handleInputChange('sku_correspondente', e.target.value)}
              placeholder="Ex: SKU001-CORRIGIDO"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku_simples">SKU Unitário</Label>
            <Input
              id="sku_simples"
              value={formData.sku_simples}
              onChange={(e) => handleInputChange('sku_simples', e.target.value)}
              placeholder="Ex: SKU001-UNIT"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantidade">Quantidade Do Kit</Label>
            <Input
              id="quantidade"
              type="number"
              value={formData.quantidade}
              onChange={(e) => handleInputChange('quantidade', parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="ativo"
              checked={formData.ativo}
              onCheckedChange={(checked) => handleInputChange('ativo', checked)}
            />
            <Label htmlFor="ativo">Mapeamento ativo</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              placeholder="Observações adicionais sobre o mapeamento..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
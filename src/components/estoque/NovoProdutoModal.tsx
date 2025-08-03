import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface NovoProdutoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NovoProdutoModal({ isOpen, onClose, onSuccess }: NovoProdutoModalProps) {
  const [formData, setFormData] = useState({
    sku_interno: '',
    nome: '',
    categoria: '',
    descricao: '',
    quantidade_atual: 0,
    estoque_minimo: 0,
    estoque_maximo: 0,
    preco_custo: 0,
    preco_venda: 0,
    codigo_barras: '',
    localizacao: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sku_interno || !formData.nome) {
      toast({
        title: "Campos obrigatórios",
        description: "SKU interno e nome são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('produtos')
        .insert([{
          ...formData,
          status: 'ativo',
          ativo: true
        }]);

      if (error) {
        throw error;
      }

      toast({
        title: "Produto criado",
        description: "Produto adicionado com sucesso!",
      });

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Erro ao criar produto:', error);
      toast({
        title: "Erro ao criar produto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      sku_interno: '',
      nome: '',
      categoria: '',
      descricao: '',
      quantidade_atual: 0,
      estoque_minimo: 0,
      estoque_maximo: 0,
      preco_custo: 0,
      preco_venda: 0,
      codigo_barras: '',
      localizacao: ''
    });
    onClose();
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Produto</DialogTitle>
          <DialogDescription>
            Adicione um novo produto ao seu estoque
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Informações básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku_interno">SKU Interno *</Label>
              <Input
                id="sku_interno"
                value={formData.sku_interno}
                onChange={(e) => updateFormData('sku_interno', e.target.value)}
                placeholder="Ex: SKU-001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="codigo_barras">Código de Barras</Label>
              <Input
                id="codigo_barras"
                value={formData.codigo_barras}
                onChange={(e) => updateFormData('codigo_barras', e.target.value)}
                placeholder="Ex: 7891234567890"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Produto *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => updateFormData('nome', e.target.value)}
              placeholder="Ex: Camiseta Polo Branca"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select value={formData.categoria} onValueChange={(value) => updateFormData('categoria', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Eletrônicos">Eletrônicos</SelectItem>
                  <SelectItem value="Roupas">Roupas</SelectItem>
                  <SelectItem value="Casa">Casa</SelectItem>
                  <SelectItem value="Esporte">Esporte</SelectItem>
                  <SelectItem value="Livros">Livros</SelectItem>
                  <SelectItem value="Alimentação">Alimentação</SelectItem>
                  <SelectItem value="Saúde">Saúde</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="localizacao">Localização</Label>
              <Input
                id="localizacao"
                value={formData.localizacao}
                onChange={(e) => updateFormData('localizacao', e.target.value)}
                placeholder="Ex: Prateleira A-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => updateFormData('descricao', e.target.value)}
              placeholder="Descrição detalhada do produto..."
              rows={3}
            />
          </div>

          {/* Estoque */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantidade_atual">Quantidade Atual</Label>
              <Input
                id="quantidade_atual"
                type="number"
                min="0"
                value={formData.quantidade_atual}
                onChange={(e) => updateFormData('quantidade_atual', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estoque_minimo">Estoque Mínimo</Label>
              <Input
                id="estoque_minimo"
                type="number"
                min="0"
                value={formData.estoque_minimo}
                onChange={(e) => updateFormData('estoque_minimo', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estoque_maximo">Estoque Máximo</Label>
              <Input
                id="estoque_maximo"
                type="number"
                min="0"
                value={formData.estoque_maximo}
                onChange={(e) => updateFormData('estoque_maximo', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Preços */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preco_custo">Preço de Custo (R$)</Label>
              <Input
                id="preco_custo"
                type="number"
                min="0"
                step="0.01"
                value={formData.preco_custo}
                onChange={(e) => updateFormData('preco_custo', parseFloat(e.target.value) || 0)}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preco_venda">Preço de Venda (R$)</Label>
              <Input
                id="preco_venda"
                type="number"
                min="0"
                step="0.01"
                value={formData.preco_venda}
                onChange={(e) => updateFormData('preco_venda', parseFloat(e.target.value) || 0)}
                placeholder="0,00"
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.sku_interno || !formData.nome}
              className="flex-1"
            >
              {loading ? 'Criando...' : 'Criar Produto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
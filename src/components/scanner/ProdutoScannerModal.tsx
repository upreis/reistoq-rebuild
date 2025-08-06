import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Package, Scan } from "lucide-react";

interface ScannedProduct {
  id?: string;
  nome: string;
  sku_interno: string;
  codigo_barras: string;
  quantidade_atual: number;
  estoque_minimo: number;
  status: string;
  categoria?: string;
  preco_venda?: number;
  ultima_movimentacao?: string;
}

interface ProdutoScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (produto: ScannedProduct) => void;
  codigoEscaneado: string;
  produtoEncontrado?: ScannedProduct | null;
}

export function ProdutoScannerModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  codigoEscaneado,
  produtoEncontrado 
}: ProdutoScannerModalProps) {
  const [formData, setFormData] = useState({
    sku_interno: '',
    nome: '',
    categoria: '',
    descricao: '',
    quantidade_atual: 0,
    estoque_minimo: 10,
    estoque_maximo: 100,
    preco_custo: 0,
    preco_venda: 0,
    codigo_barras: codigoEscaneado,
    localizacao: '',
    status: 'ativo'
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isEditing = !!produtoEncontrado;

  // Preencher formulário quando um produto for encontrado
  useEffect(() => {
    if (produtoEncontrado) {
      setFormData({
        sku_interno: produtoEncontrado.sku_interno || '',
        nome: produtoEncontrado.nome || '',
        categoria: produtoEncontrado.categoria || '',
        descricao: '',
        quantidade_atual: produtoEncontrado.quantidade_atual || 0,
        estoque_minimo: produtoEncontrado.estoque_minimo || 10,
        estoque_maximo: 100,
        preco_custo: 0,
        preco_venda: produtoEncontrado.preco_venda || 0,
        codigo_barras: produtoEncontrado.codigo_barras || codigoEscaneado,
        localizacao: '',
        status: produtoEncontrado.status || 'ativo'
      });
    } else {
      setFormData(prev => ({
        ...prev,
        codigo_barras: codigoEscaneado,
        sku_interno: codigoEscaneado || '',
        nome: ''
      }));
    }
  }, [produtoEncontrado, codigoEscaneado]);

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
      let produto: ScannedProduct;

      if (isEditing && produtoEncontrado) {
        // Atualizar produto existente
        const { data, error } = await supabase
          .from('produtos')
          .update({
            ...formData,
            ativo: true
          })
          .eq('id', produtoEncontrado.id)
          .select()
          .single();

        if (error) throw error;

        produto = {
          id: data.id,
          nome: data.nome,
          sku_interno: data.sku_interno,
          codigo_barras: data.codigo_barras,
          quantidade_atual: data.quantidade_atual,
          estoque_minimo: data.estoque_minimo,
          status: data.status,
          categoria: data.categoria,
          preco_venda: data.preco_venda,
          ultima_movimentacao: data.ultima_movimentacao
        };

        toast({
          title: "Produto atualizado",
          description: "Produto atualizado com sucesso!",
        });
      } else {
        // Criar novo produto
        const { data, error } = await supabase
          .from('produtos')
          .insert([{
            ...formData,
            ativo: true
          }])
          .select()
          .single();

        if (error) throw error;

        produto = {
          id: data.id,
          nome: data.nome,
          sku_interno: data.sku_interno,
          codigo_barras: data.codigo_barras,
          quantidade_atual: data.quantidade_atual,
          estoque_minimo: data.estoque_minimo,
          status: data.status,
          categoria: data.categoria,
          preco_venda: data.preco_venda,
          ultima_movimentacao: data.ultima_movimentacao
        };

        toast({
          title: "Produto criado",
          description: "Produto adicionado com sucesso!",
        });
      }

      onSuccess(produto);
      handleClose();
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);
      toast({
        title: isEditing ? "Erro ao atualizar produto" : "Erro ao criar produto",
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
      estoque_minimo: 10,
      estoque_maximo: 100,
      preco_custo: 0,
      preco_venda: 0,
      codigo_barras: '',
      localizacao: '',
      status: 'ativo'
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
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? <Package className="h-5 w-5" /> : <Scan className="h-5 w-5" />}
            {isEditing ? 'Editar Produto' : 'Novo Produto Escaneado'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? `Editando produto com código: ${codigoEscaneado}`
              : `Código ${codigoEscaneado} não encontrado. Cadastre um novo produto.`
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Código escaneado - readonly */}
          <div className="p-3 bg-primary/10 rounded-lg border">
            <Label className="text-sm font-medium text-muted-foreground">Código Escaneado</Label>
            <p className="text-lg font-mono font-bold text-primary">{codigoEscaneado}</p>
          </div>

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
              {loading 
                ? (isEditing ? 'Atualizando...' : 'Criando...') 
                : (isEditing ? 'Atualizar Produto' : 'Criar Produto')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
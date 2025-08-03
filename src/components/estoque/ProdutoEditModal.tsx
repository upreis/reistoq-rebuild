import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ProdutoImageUpload } from './ProdutoImageUpload';

interface Produto {
  id: string;
  codigo_barras?: string;
  sku_interno: string;
  nome: string;
  categoria?: string;
  descricao?: string;
  quantidade_atual: number;
  estoque_minimo: number;
  estoque_maximo: number;
  preco_custo?: number;
  preco_venda?: number;
  localizacao?: string;
  status: string;
  url_imagem?: string;
}

interface ProdutoEditModalProps {
  produto: Produto | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const ProdutoEditModal: React.FC<ProdutoEditModalProps> = ({
  produto,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Partial<Produto>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (produto) {
      setFormData({
        codigo_barras: produto.codigo_barras || '',
        sku_interno: produto.sku_interno,
        nome: produto.nome,
        categoria: produto.categoria || '',
        descricao: produto.descricao || '',
        quantidade_atual: produto.quantidade_atual,
        estoque_minimo: produto.estoque_minimo,
        estoque_maximo: produto.estoque_maximo,
        preco_custo: produto.preco_custo || 0,
        preco_venda: produto.preco_venda || 0,
        localizacao: produto.localizacao || '',
        status: produto.status,
        url_imagem: produto.url_imagem || '',
      });
    }
  }, [produto]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!produto) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('produtos')
        .update({
          codigo_barras: formData.codigo_barras || null,
          sku_interno: formData.sku_interno,
          nome: formData.nome,
          categoria: formData.categoria || null,
          descricao: formData.descricao || null,
          quantidade_atual: formData.quantidade_atual,
          estoque_minimo: formData.estoque_minimo,
          estoque_maximo: formData.estoque_maximo,
          preco_custo: formData.preco_custo,
          preco_venda: formData.preco_venda,
          localizacao: formData.localizacao || null,
          status: formData.status,
          url_imagem: formData.url_imagem || null,
        })
        .eq('id', produto.id);

      if (error) {
        throw error;
      }

      toast({
        title: 'Sucesso',
        description: 'Produto atualizado com sucesso!',
      });

      onSave();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar produto. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUploaded = (url: string) => {
    setFormData(prev => ({
      ...prev,
      url_imagem: url,
    }));
  };

  if (!produto) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Editar Produto</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Coluna 1 */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome || ''}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                placeholder="Nome do produto"
              />
            </div>

            <div>
              <Label htmlFor="sku_interno">SKU Interno *</Label>
              <Input
                id="sku_interno"
                value={formData.sku_interno || ''}
                onChange={(e) => handleInputChange('sku_interno', e.target.value)}
                placeholder="SKU interno"
              />
            </div>

            <div>
              <Label htmlFor="codigo_barras">Código de Barras</Label>
              <Input
                id="codigo_barras"
                value={formData.codigo_barras || ''}
                onChange={(e) => handleInputChange('codigo_barras', e.target.value)}
                placeholder="Código de barras"
              />
            </div>

            <div>
              <Label htmlFor="categoria">Categoria</Label>
              <Input
                id="categoria"
                value={formData.categoria || ''}
                onChange={(e) => handleInputChange('categoria', e.target.value)}
                placeholder="Categoria do produto"
              />
            </div>

            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao || ''}
                onChange={(e) => handleInputChange('descricao', e.target.value)}
                placeholder="Descrição do produto"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="localizacao">Localização</Label>
              <Input
                id="localizacao"
                value={formData.localizacao || ''}
                onChange={(e) => handleInputChange('localizacao', e.target.value)}
                placeholder="Localização no estoque"
              />
            </div>
          </div>

          {/* Coluna 2 */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="quantidade_atual">Quantidade Atual *</Label>
              <Input
                id="quantidade_atual"
                type="number"
                value={formData.quantidade_atual || 0}
                onChange={(e) => handleInputChange('quantidade_atual', parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="estoque_minimo">Estoque Mínimo *</Label>
              <Input
                id="estoque_minimo"
                type="number"
                value={formData.estoque_minimo || 0}
                onChange={(e) => handleInputChange('estoque_minimo', parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="estoque_maximo">Estoque Máximo *</Label>
              <Input
                id="estoque_maximo"
                type="number"
                value={formData.estoque_maximo || 0}
                onChange={(e) => handleInputChange('estoque_maximo', parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="preco_custo">Preço de Custo</Label>
              <Input
                id="preco_custo"
                type="number"
                step="0.01"
                value={formData.preco_custo || 0}
                onChange={(e) => handleInputChange('preco_custo', parseFloat(e.target.value) || 0)}
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="preco_venda">Preço de Venda</Label>
              <Input
                id="preco_venda"
                type="number"
                step="0.01"
                value={formData.preco_venda || 0}
                onChange={(e) => handleInputChange('preco_venda', parseFloat(e.target.value) || 0)}
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status || 'ativo'} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="descontinuado">Descontinuado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Imagem do Produto</Label>
              <div className="mt-2">
                <ProdutoImageUpload
                  produtoId={produto.id}
                  currentImageUrl={formData.url_imagem}
                  onImageUploaded={handleImageUploaded}
                />
              </div>
              {formData.url_imagem && (
                <div className="mt-2">
                  <img
                    src={formData.url_imagem}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded border"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
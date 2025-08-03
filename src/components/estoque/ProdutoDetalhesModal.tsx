import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
  created_at: string;
  updated_at: string;
  ultima_movimentacao?: string;
}

interface ProdutoDetalhesModalProps {
  produto: Produto | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProdutoDetalhesModal: React.FC<ProdutoDetalhesModalProps> = ({
  produto,
  isOpen,
  onClose,
}) => {
  if (!produto) return null;

  const formatarMoeda = (valor?: number) => {
    return valor ? new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor) : 'N/A';
  };

  const formatarData = (data?: string) => {
    return data ? new Date(data).toLocaleString('pt-BR') : 'N/A';
  };

  const getStatusBadge = (quantidade: number, minimo: number, maximo: number) => {
    if (quantidade === 0) {
      return <Badge variant="destructive">Sem Estoque</Badge>;
    } else if (quantidade <= minimo) {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Estoque Baixo</Badge>;
    } else if (quantidade >= maximo) {
      return <Badge variant="secondary">Estoque Alto</Badge>;
    } else {
      return <Badge variant="default" className="bg-green-600 text-white">Normal</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Detalhes do Produto</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Imagem do Produto */}
          <div className="flex justify-center">
            {produto.url_imagem ? (
              <img
                src={produto.url_imagem}
                alt={produto.nome}
                className="w-48 h-48 object-cover rounded-lg border"
              />
            ) : (
              <div className="w-48 h-48 bg-muted rounded-lg border flex items-center justify-center">
                <span className="text-muted-foreground">Sem imagem</span>
              </div>
            )}
          </div>

          {/* Informações Básicas */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">{produto.nome}</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-muted-foreground">SKU Interno:</span>
                <p className="text-sm">{produto.sku_interno}</p>
              </div>
              
              {produto.codigo_barras && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Código de Barras:</span>
                  <p className="text-sm">{produto.codigo_barras}</p>
                </div>
              )}
              
              {produto.categoria && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Categoria:</span>
                  <p className="text-sm">{produto.categoria}</p>
                </div>
              )}
              
              <div>
                <span className="text-sm font-medium text-muted-foreground">Status:</span>
                <p className="text-sm">{getStatusBadge(produto.quantidade_atual, produto.estoque_minimo, produto.estoque_maximo)}</p>
              </div>
            </div>

            {produto.descricao && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Descrição:</span>
                <p className="text-sm mt-1">{produto.descricao}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Informações de Estoque */}
          <div>
            <h4 className="font-semibold mb-3">Informações de Estoque</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Quantidade Atual</span>
                <p className="text-2xl font-bold">{produto.quantidade_atual}</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Estoque Mínimo</span>
                <p className="text-lg font-semibold">{produto.estoque_minimo}</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Estoque Máximo</span>
                <p className="text-lg font-semibold">{produto.estoque_maximo}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Informações Financeiras */}
          <div>
            <h4 className="font-semibold mb-3">Informações Financeiras</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Preço de Custo:</span>
                <p className="text-lg font-semibold">{formatarMoeda(produto.preco_custo)}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Preço de Venda:</span>
                <p className="text-lg font-semibold">{formatarMoeda(produto.preco_venda)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Informações Adicionais */}
          <div>
            <h4 className="font-semibold mb-3">Informações Adicionais</h4>
            <div className="space-y-2">
              {produto.localizacao && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Localização:</span>
                  <span className="text-sm">{produto.localizacao}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Criado em:</span>
                <span className="text-sm">{formatarData(produto.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Atualizado em:</span>
                <span className="text-sm">{formatarData(produto.updated_at)}</span>
              </div>
              {produto.ultima_movimentacao && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Última Movimentação:</span>
                  <span className="text-sm">{formatarData(produto.ultima_movimentacao)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
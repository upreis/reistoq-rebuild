import { useState } from 'react';
import { AlertTriangle, Package, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface MovimentacaoCompleta {
  id: string;
  tipo_movimentacao: string;
  quantidade_movimentada: number;
  quantidade_anterior: number;
  quantidade_nova: number;
  motivo?: string;
  observacoes?: string;
  created_at: string;
  produto_id: string;
  produto?: {
    nome: string;
    sku_interno: string;
    quantidade_atual: number;
  };
}

interface ExclusaoMovimentacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  movimentacao: MovimentacaoCompleta | null;
  onConfirm: (movimentacaoId: string, retornarAoEstoque: boolean) => Promise<void>;
}

export function ExclusaoMovimentacaoModal({
  isOpen,
  onClose,
  movimentacao,
  onConfirm
}: ExclusaoMovimentacaoModalProps) {
  const [opcaoSelecionada, setOpcaoSelecionada] = useState<'apenas-historico' | 'retornar-estoque'>('apenas-historico');
  const [loading, setLoading] = useState(false);

  if (!movimentacao) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const retornarAoEstoque = opcaoSelecionada === 'retornar-estoque';
      await onConfirm(movimentacao.id, retornarAoEstoque);
      onClose();
    } catch (error) {
      console.error('Erro ao excluir movimentação:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTipoMovimentacaoLabel = (tipo: string) => {
    switch (tipo) {
      case 'entrada': return 'Entrada';
      case 'saida': return 'Saída';
      case 'ajuste': return 'Ajuste';
      case 'transferencia': return 'Transferência';
      default: return tipo;
    }
  };

  const getTipoMovimentacaoColor = (tipo: string) => {
    switch (tipo) {
      case 'entrada': return 'bg-green-100 text-green-800';
      case 'saida': return 'bg-red-100 text-red-800';
      case 'ajuste': return 'bg-blue-100 text-blue-800';
      case 'transferencia': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const quantidadeAtualProduto = movimentacao.produto?.quantidade_atual || 0;
  const novaQuantidadeSeRetornar = movimentacao.tipo_movimentacao === 'entrada' 
    ? quantidadeAtualProduto - movimentacao.quantidade_movimentada
    : quantidadeAtualProduto + movimentacao.quantidade_movimentada;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Confirmar Exclusão de Movimentação
          </DialogTitle>
          <DialogDescription>
            Escolha como deseja proceder com a exclusão desta movimentação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações da Movimentação */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Detalhes da Movimentação</h4>
              <Badge className={getTipoMovimentacaoColor(movimentacao.tipo_movimentacao)}>
                {getTipoMovimentacaoLabel(movimentacao.tipo_movimentacao)}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Produto:</span>
                <p className="font-medium">{movimentacao.produto?.nome}</p>
                <p className="text-xs text-muted-foreground">SKU: {movimentacao.produto?.sku_interno}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Quantidade:</span>
                <p className="font-medium">{movimentacao.quantidade_movimentada} unidades</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Anterior:</span>
                <p className="font-medium">{movimentacao.quantidade_anterior}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Após movimentação:</span>
                <p className="font-medium">{movimentacao.quantidade_nova}</p>
              </div>
            </div>

            {movimentacao.motivo && (
              <div>
                <span className="text-muted-foreground text-sm">Motivo:</span>
                <p className="text-sm">{movimentacao.motivo}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Opções de Exclusão */}
          <RadioGroup value={opcaoSelecionada} onValueChange={(value: any) => setOpcaoSelecionada(value)}>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                <RadioGroupItem value="apenas-historico" id="apenas-historico" />
                <Label htmlFor="apenas-historico" className="cursor-pointer flex-1">
                  <div>
                    <div className="font-medium">Excluir apenas do histórico</div>
                    <div className="text-sm text-muted-foreground">
                      Remove o registro do histórico mas mantém o estoque atual como está
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Estoque atual: <span className="font-medium">{quantidadeAtualProduto} unidades</span>
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                <RadioGroupItem value="retornar-estoque" id="retornar-estoque" />
                <Label htmlFor="retornar-estoque" className="cursor-pointer flex-1">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Retornar quantidade ao estoque
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Reverte a movimentação e ajusta o estoque para o estado anterior
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Estoque ficará com: <span className="font-medium text-blue-600">{novaQuantidadeSeRetornar} unidades</span>
                      {novaQuantidadeSeRetornar < 0 && (
                        <span className="text-red-600 ml-2">⚠️ Estoque ficará negativo!</span>
                      )}
                    </div>
                  </div>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {loading ? 'Excluindo...' : 'Confirmar Exclusão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
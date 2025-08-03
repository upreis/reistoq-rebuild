import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Produto } from "@/hooks/useEstoque";
import { useMovimentacoes } from "@/hooks/useMovimentacoes";

interface MovimentacaoModalProps {
  produto: Produto | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MovimentacaoModal({ produto, isOpen, onClose, onSuccess }: MovimentacaoModalProps) {
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [tipoMovimentacao, setTipoMovimentacao] = useState<'entrada' | 'saida' | ''>('');
  const [loading, setLoading] = useState(false);
  const { registrarMovimentacao } = useMovimentacoes();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produto || !quantidade || !motivo || !tipoMovimentacao) return;

    setLoading(true);
    try {
      const quantidadeNum = parseInt(quantidade);
      const novaQuantidade = tipoMovimentacao === 'entrada' 
        ? produto.quantidade_atual + quantidadeNum
        : produto.quantidade_atual - quantidadeNum;

      if (novaQuantidade < 0) {
        alert('Quantidade insuficiente em estoque!');
        return;
      }

      await registrarMovimentacao(
        produto.id,
        produto.quantidade_atual,
        novaQuantidade,
        motivo,
        observacoes
      );

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Erro ao registrar movimentação:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setQuantidade('');
    setMotivo('');
    setObservacoes('');
    setTipoMovimentacao('');
    onClose();
  };

  const getNovaQuantidade = () => {
    if (!produto || !quantidade || !tipoMovimentacao) return produto?.quantidade_atual || 0;
    
    const quantidadeNum = parseInt(quantidade) || 0;
    return tipoMovimentacao === 'entrada' 
      ? produto.quantidade_atual + quantidadeNum
      : produto.quantidade_atual - quantidadeNum;
  };

  const novaQuantidade = getNovaQuantidade();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Movimentar Estoque</DialogTitle>
          <DialogDescription>
            {produto?.nome} - SKU: {produto?.sku_interno}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Informações atuais */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Quantidade Atual:</span>
              <Badge variant="outline">{produto?.quantidade_atual}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Nova Quantidade:</span>
              <Badge variant={novaQuantidade < 0 ? "destructive" : "default"}>
                {novaQuantidade}
              </Badge>
            </div>
          </div>

          {/* Tipo de movimentação */}
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Movimentação</Label>
            <Select value={tipoMovimentacao} onValueChange={(value: 'entrada' | 'saida') => setTipoMovimentacao(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quantidade */}
          <div className="space-y-2">
            <Label htmlFor="quantidade">Quantidade</Label>
            <Input
              id="quantidade"
              type="number"
              min="1"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              placeholder="Digite a quantidade"
              required
            />
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compra">Compra</SelectItem>
                <SelectItem value="venda">Venda</SelectItem>
                <SelectItem value="devolucao">Devolução</SelectItem>
                <SelectItem value="perda">Perda</SelectItem>
                <SelectItem value="avaria">Avaria</SelectItem>
                <SelectItem value="ajuste">Ajuste de Inventário</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Detalhes adicionais sobre a movimentação..."
              rows={3}
            />
          </div>

          {/* Alerta para quantidade negativa */}
          {novaQuantidade < 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Atenção: Esta operação resultará em estoque negativo!
              </p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !quantidade || !motivo || !tipoMovimentacao}
              className="flex-1"
            >
              {loading ? 'Salvando...' : 'Registrar Movimentação'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
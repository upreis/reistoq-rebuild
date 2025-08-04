import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Produto {
  id: string;
  nome: string;
  sku_interno: string;
  quantidade_atual: number;
}

interface NovaMovimentacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NovaMovimentacaoModal({
  open,
  onOpenChange,
  onSuccess,
}: NovaMovimentacaoModalProps) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [tipoMovimentacao, setTipoMovimentacao] = useState<string>("");
  const [quantidadeMovimentada, setQuantidadeMovimentada] = useState<string>("");
  const [motivo, setMotivo] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const { toast } = useToast();

  const buscarProdutos = async () => {
    try {
      setLoadingProdutos(true);
      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, sku_interno, quantidade_atual')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setProdutos(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar produtos:', error);
      toast({
        title: "Erro ao carregar produtos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingProdutos(false);
    }
  };

  useEffect(() => {
    if (open) {
      buscarProdutos();
    }
  }, [open]);

  const calcularNovaQuantidade = () => {
    if (!produtoSelecionado || !quantidadeMovimentada || !tipoMovimentacao) {
      return produtoSelecionado?.quantidade_atual || 0;
    }

    const qtdMovimentada = parseInt(quantidadeMovimentada);
    if (tipoMovimentacao === 'entrada') {
      return produtoSelecionado.quantidade_atual + qtdMovimentada;
    } else {
      return Math.max(0, produtoSelecionado.quantidade_atual - qtdMovimentada);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!produtoSelecionado || !tipoMovimentacao || !quantidadeMovimentada || !motivo) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const qtdMovimentada = parseInt(quantidadeMovimentada);
    if (isNaN(qtdMovimentada) || qtdMovimentada <= 0) {
      toast({
        title: "Quantidade inválida",
        description: "A quantidade deve ser um número positivo.",
        variant: "destructive",
      });
      return;
    }

    if (tipoMovimentacao === 'saida' && qtdMovimentada > produtoSelecionado.quantidade_atual) {
      toast({
        title: "Quantidade insuficiente",
        description: "A quantidade de saída não pode ser maior que o estoque atual.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const novaQuantidade = calcularNovaQuantidade();

      // Inserir movimentação
      const { error: movError } = await supabase
        .from('movimentacoes_estoque')
        .insert({
          produto_id: produtoSelecionado.id,
          tipo_movimentacao: tipoMovimentacao,
          quantidade_anterior: produtoSelecionado.quantidade_atual,
          quantidade_nova: novaQuantidade,
          quantidade_movimentada: qtdMovimentada,
          motivo,
          observacoes: observacoes || null,
        });

      if (movError) throw movError;

      // Atualizar quantidade do produto
      const { error: prodError } = await supabase
        .from('produtos')
        .update({ quantidade_atual: novaQuantidade })
        .eq('id', produtoSelecionado.id);

      if (prodError) throw prodError;

      toast({
        title: "Movimentação registrada",
        description: "A movimentação foi registrada com sucesso.",
      });

      // Reset form
      setProdutoSelecionado(null);
      setTipoMovimentacao("");
      setQuantidadeMovimentada("");
      setMotivo("");
      setObservacoes("");
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao registrar movimentação:', error);
      toast({
        title: "Erro ao registrar movimentação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Nova Movimentação</DialogTitle>
          <DialogDescription>
            Registre uma nova movimentação de estoque
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="produto">Produto *</Label>
              <Select
                value={produtoSelecionado?.id || ""}
                onValueChange={(value) => {
                  const produto = produtos.find(p => p.id === value);
                  setProdutoSelecionado(produto || null);
                }}
                disabled={loadingProdutos}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingProdutos ? "Carregando..." : "Selecione um produto"} />
                </SelectTrigger>
                <SelectContent>
                  {produtos.map((produto) => (
                    <SelectItem key={produto.id} value={produto.id}>
                      {produto.nome} - {produto.sku_interno} (Estoque: {produto.quantidade_atual})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Movimentação *</Label>
              <Select value={tipoMovimentacao} onValueChange={setTipoMovimentacao}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade Movimentada *</Label>
              <Input
                id="quantidade"
                type="number"
                min="1"
                value={quantidadeMovimentada}
                onChange={(e) => setQuantidadeMovimentada(e.target.value)}
                placeholder="Digite a quantidade"
              />
            </div>

            {produtoSelecionado && (
              <div className="space-y-2">
                <Label>Previsão</Label>
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <div>Estoque atual: <strong>{produtoSelecionado.quantidade_atual}</strong></div>
                  <div>Nova quantidade: <strong>{calcularNovaQuantidade()}</strong></div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo *</Label>
            <Input
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Reposição de estoque, Venda, Avaria..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações adicionais (opcional)"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Registrando..." : "Registrar Movimentação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
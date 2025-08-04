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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MovimentacaoHistorico {
  id: string;
  produto_id: string;
  tipo_movimentacao: string;
  quantidade_anterior: number;
  quantidade_nova: number;
  quantidade_movimentada: number;
  motivo: string | null;
  observacoes: string | null;
  created_at: string;
  produto?: {
    nome: string;
    sku_interno: string;
    codigo_barras: string | null;
  };
}

interface MovimentacaoEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movimentacao: MovimentacaoHistorico | null;
  onSuccess: () => void;
}

export function MovimentacaoEditModal({
  open,
  onOpenChange,
  movimentacao,
  onSuccess,
}: MovimentacaoEditModalProps) {
  const [motivo, setMotivo] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (movimentacao) {
      setMotivo(movimentacao.motivo || "");
      setObservacoes(movimentacao.observacoes || "");
    }
  }, [movimentacao]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!movimentacao || !motivo.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, informe o motivo da movimentação.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('movimentacoes_estoque')
        .update({
          motivo: motivo.trim(),
          observacoes: observacoes.trim() || null,
        })
        .eq('id', movimentacao.id);

      if (error) throw error;

      toast({
        title: "Movimentação atualizada",
        description: "As informações da movimentação foram atualizadas com sucesso.",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao atualizar movimentação:', error);
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!movimentacao) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Movimentação</DialogTitle>
          <DialogDescription>
            Edite as informações da movimentação de estoque
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações não editáveis */}
          <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
            <div><strong>Produto:</strong> {movimentacao.produto?.nome}</div>
            <div><strong>SKU:</strong> {movimentacao.produto?.sku_interno}</div>
            <div><strong>Tipo:</strong> {movimentacao.tipo_movimentacao === 'entrada' ? 'Entrada' : 'Saída'}</div>
            <div><strong>Quantidade Movimentada:</strong> {movimentacao.quantidade_movimentada}</div>
            <div><strong>Data:</strong> {new Date(movimentacao.created_at).toLocaleString('pt-BR')}</div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo *</Label>
              <Input
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex: Reposição de estoque, Venda, Avaria..."
                required
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
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EstoqueHeaderProps {
  produtosSelecionados: string[];
  loading: boolean;
  onRefresh: () => void;
  onExcluirSelecionados: () => void;
  onNovoProduto: () => void;
}

export function EstoqueHeader({
  produtosSelecionados,
  loading,
  onRefresh,
  onExcluirSelecionados,
  onNovoProduto
}: EstoqueHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Controle de Estoque</h1>
        <p className="text-muted-foreground">Gestão completa de produtos e movimentações</p>
      </div>
      <div className="flex gap-2">
        {produtosSelecionados.length > 0 && (
          <Button 
            variant="destructive" 
            onClick={onExcluirSelecionados}
            className="mr-2"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir Selecionados ({produtosSelecionados.length})
          </Button>
        )}
        <Button variant="outline" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
        <Button variant="premium" onClick={onNovoProduto}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Produto
        </Button>
      </div>
    </div>
  );
}
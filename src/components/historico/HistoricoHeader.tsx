import { History, Download, RefreshCw, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HistoricoHeaderProps {
  movimentacoesSelecionadas: string[];
  loading: boolean;
  onRefresh: () => void;
  onExcluirSelecionadas: () => void;
  onNovaMovimentacao: () => void;
  onGerarRelatorio: (tipo: string) => void;
}

export function HistoricoHeader({
  movimentacoesSelecionadas,
  loading,
  onRefresh,
  onExcluirSelecionadas,
  onNovaMovimentacao,
  onGerarRelatorio,
}: HistoricoHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <History className="h-8 w-8 text-primary" />
          Histórico de Movimentações
        </h1>
        <p className="text-muted-foreground">
          Controle completo de todas as movimentações de estoque
        </p>
      </div>
      
      <div className="flex flex-wrap items-center gap-2">
        {movimentacoesSelecionadas.length > 0 && (
          <>
            <Badge variant="secondary" className="text-sm">
              {movimentacoesSelecionadas.length} selecionada(s)
            </Badge>
            <Button
              variant="destructive"
              size="sm"
              onClick={onExcluirSelecionadas}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Excluir Selecionadas
            </Button>
          </>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onGerarRelatorio('movimentacoes')}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Exportar
        </Button>
        
        <Button
          onClick={onNovaMovimentacao}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova Movimentação
        </Button>
      </div>
    </div>
  );
}
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Download, Plus, Trash2 } from "lucide-react";

interface VendasHeaderProps {
  vendasSelecionadas: string[];
  loading: boolean;
  onRefresh: () => void;
  onExcluirSelecionadas: () => void;
  onNovaVenda: () => void;
  onGerarRelatorio: (tipo: string) => void;
}

export function VendasHeader({
  vendasSelecionadas,
  loading,
  onRefresh,
  onExcluirSelecionadas,
  onNovaVenda,
  onGerarRelatorio
}: VendasHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-6 rounded-lg border">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Histórico de Vendas</h1>
          {vendasSelecionadas.length > 0 && (
            <Badge variant="secondary">
              {vendasSelecionadas.length} selecionada{vendasSelecionadas.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">
          Controle completo do histórico de vendas e transações
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onGerarRelatorio('vendas')}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
        
        <Button 
          size="sm" 
          onClick={onNovaVenda}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Venda
        </Button>
        
        {vendasSelecionadas.length > 0 && (
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={onExcluirSelecionadas}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir ({vendasSelecionadas.length})
          </Button>
        )}
      </div>
    </div>
  );
}
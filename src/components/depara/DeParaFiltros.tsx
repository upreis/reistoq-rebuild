import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";
import { FiltrosDePara } from "@/hooks/useDePara";

interface DeParaFiltrosProps {
  filtros: FiltrosDePara;
  onAtualizarFiltros: (filtros: Partial<FiltrosDePara>) => void;
  onLimparFiltros: () => void;
}

export function DeParaFiltros({ 
  filtros, 
  onAtualizarFiltros, 
  onLimparFiltros 
}: DeParaFiltrosProps) {
  const temFiltrosAtivos = filtros.busca || filtros.status;

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 border border-border rounded-lg bg-card">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por SKU do pedido, SKU correspondente ou SKU unitário..."
            value={filtros.busca}
            onChange={(e) => onAtualizarFiltros({ busca: e.target.value })}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 sm:w-auto">
        <Select
          value={filtros.status}
          onValueChange={(value) => onAtualizarFiltros({ status: value === 'all' ? '' : value })}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>

        {temFiltrosAtivos && (
          <Button
            variant="outline"
            onClick={onLimparFiltros}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
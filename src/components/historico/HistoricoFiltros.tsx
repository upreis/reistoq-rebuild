import { Search, Filter, X, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FiltrosHistorico {
  termo_busca: string;
  tipo_movimentacao: string;
  data_inicio: string;
  data_fim: string;
  produto_id: string;
}

interface HistoricoFiltrosProps {
  filtros: FiltrosHistorico;
  onAtualizarFiltros: (filtros: Partial<FiltrosHistorico>) => void;
  onLimparFiltros: () => void;
}

export function HistoricoFiltros({
  filtros,
  onAtualizarFiltros,
  onLimparFiltros,
}: HistoricoFiltrosProps) {
  const temFiltrosAtivos = Object.values(filtros).some(valor => valor !== '');

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-4 w-4" />
          Filtros de Busca
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar..."
              value={filtros.termo_busca}
              onChange={(e) => onAtualizarFiltros({ termo_busca: e.target.value })}
              className="pl-10 h-9"
            />
          </div>

          <Select
            value={filtros.tipo_movimentacao || 'all'}
            onValueChange={(value) => onAtualizarFiltros({ tipo_movimentacao: value === 'all' ? '' : value })}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="saida">Saída</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="date"
              value={filtros.data_inicio}
              onChange={(e) => onAtualizarFiltros({ data_inicio: e.target.value })}
              className="pl-10 h-9"
            />
          </div>

          <Button
            variant={temFiltrosAtivos ? "outline" : "secondary"}
            onClick={onLimparFiltros}
            className="flex items-center gap-2 h-9"
            disabled={!temFiltrosAtivos}
            size="sm"
          >
            <X className="h-4 w-4" />
            Limpar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
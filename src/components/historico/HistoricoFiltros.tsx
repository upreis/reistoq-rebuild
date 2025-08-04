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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros de Busca
        </CardTitle>
        <CardDescription>
          Filtre o histórico por produto, tipo de movimentação ou período
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar produto, SKU ou motivo..."
              value={filtros.termo_busca}
              onChange={(e) => onAtualizarFiltros({ termo_busca: e.target.value })}
              className="pl-10"
            />
          </div>

          <Select
            value={filtros.tipo_movimentacao}
            onValueChange={(value) => onAtualizarFiltros({ tipo_movimentacao: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tipo de movimentação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os tipos</SelectItem>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="saida">Saída</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="date"
              placeholder="Data início"
              value={filtros.data_inicio}
              onChange={(e) => onAtualizarFiltros({ data_inicio: e.target.value })}
              className="pl-10"
            />
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="date"
              placeholder="Data fim"
              value={filtros.data_fim}
              onChange={(e) => onAtualizarFiltros({ data_fim: e.target.value })}
              className="pl-10"
            />
          </div>

          <Button
            variant={temFiltrosAtivos ? "outline" : "secondary"}
            onClick={onLimparFiltros}
            className="flex items-center gap-2"
            disabled={!temFiltrosAtivos}
          >
            <X className="h-4 w-4" />
            Limpar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
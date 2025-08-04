import { useState, useCallback } from "react";
import { Search, Filter, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [buscaLocal, setBuscaLocal] = useState(filtros.busca);

  const debouncedBusca = useCallback(
    debounce((valor: string) => {
      onAtualizarFiltros({ busca: valor });
    }, 300),
    [onAtualizarFiltros]
  );

  const handleBuscaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setBuscaLocal(valor);
    debouncedBusca(valor);
  };

  // Função debounce helper
  function debounce<T extends (...args: any[]) => void>(func: T, delay: number) {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  const temFiltrosAtivos = buscaLocal || filtros.status;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Filtros Avançados</CardTitle>
        <CardDescription className="text-sm">
          Busque e filtre produtos por múltiplos critérios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Campo de busca */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Buscar mapeamentos
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por SKU do pedido, SKU correspondente ou SKU unitário..."
              value={buscaLocal}
              onChange={handleBuscaChange}
              className="pl-10"
            />
          </div>
        </div>

        {/* Filtros em linha */}
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Status
            </label>
            <Select
              value={filtros.status || 'all'}
              onValueChange={(value) => onAtualizarFiltros({ status: value === 'all' ? '' : value })}
            >
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Botão limpar filtros */}
        {temFiltrosAtivos && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setBuscaLocal('');
              onLimparFiltros();
            }}
            className="w-full mt-4"
          >
            <X className="h-4 w-4 mr-2" />
            Limpar filtros
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
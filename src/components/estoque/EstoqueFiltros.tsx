import { useState, useCallback } from "react";
import { Search, Filter, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FiltrosEstoque } from "@/hooks/useEstoque";

interface EstoqueFiltrosProps {
  filtros: FiltrosEstoque;
  onAtualizarFiltros: (novosFiltros: Partial<FiltrosEstoque>) => void;
  onLimparFiltros: () => void;
}

export function EstoqueFiltros({
  filtros,
  onAtualizarFiltros,
  onLimparFiltros
}: EstoqueFiltrosProps) {
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

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Filtros Avançados</CardTitle>
        <CardDescription className="text-sm">
          Busque e filtre produtos por múltiplos critérios
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Busca principal */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nome, SKU ou código de barras..."
              className="pl-10 h-9"
              value={buscaLocal}
              onChange={handleBuscaChange}
            />
          </div>

          {/* Filtros em grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select value={filtros.categoria} onValueChange={(value) => onAtualizarFiltros({ categoria: value })}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as categorias</SelectItem>
                <SelectItem value="Eletrônicos">Eletrônicos</SelectItem>
                <SelectItem value="Roupas">Roupas</SelectItem>
                <SelectItem value="Casa">Casa</SelectItem>
                <SelectItem value="Esporte">Esporte</SelectItem>
                <SelectItem value="Livros">Livros</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtros.status} onValueChange={(value) => onAtualizarFiltros({ status: value })}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Status do Estoque" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os status</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="baixo">Estoque Baixo</SelectItem>
                <SelectItem value="critico">Estoque Crítico</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={onLimparFiltros} 
              className="h-9"
              disabled={!filtros.busca && !filtros.categoria && !filtros.status}
            >
              <X className="mr-2 h-4 w-4" />
              Limpar
            </Button>
          </div>

          {/* Indicadores de filtros ativos */}
          {(filtros.busca || filtros.categoria || filtros.status) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <span className="text-xs text-muted-foreground">Filtros ativos:</span>
              {filtros.busca && (
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs">
                  Busca: "{filtros.busca}"
                  <X 
                    className="ml-1 h-3 w-3 cursor-pointer" 
                    onClick={() => onAtualizarFiltros({ busca: '' })}
                  />
                </span>
              )}
              {filtros.categoria && (
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary/10 text-secondary text-xs">
                  Categoria: {filtros.categoria}
                  <X 
                    className="ml-1 h-3 w-3 cursor-pointer" 
                    onClick={() => onAtualizarFiltros({ categoria: '' })}
                  />
                </span>
              )}
              {filtros.status && (
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-accent/10 text-accent text-xs">
                  Status: {filtros.status}
                  <X 
                    className="ml-1 h-3 w-3 cursor-pointer" 
                    onClick={() => onAtualizarFiltros({ status: '' })}
                  />
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
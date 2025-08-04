import { useState, useCallback } from "react";
import { Search, Filter, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const temFiltrosAtivos = buscaLocal || filtros.preenchimento !== 'todos';

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Filtros Avançados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
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

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filtros.preenchimento === 'todos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onAtualizarFiltros({ preenchimento: 'todos' })}
              className="flex items-center gap-2"
            >
              📊 Mostrar Todos
            </Button>
            <Button
              variant={filtros.preenchimento === 'pendentes' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onAtualizarFiltros({ preenchimento: 'pendentes' })}
              className="flex items-center gap-2"
            >
              ⚠️ Apenas Pendentes
            </Button>
            <Button
              variant={filtros.preenchimento === 'preenchidos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onAtualizarFiltros({ preenchimento: 'preenchidos' })}
              className="flex items-center gap-2"
            >
              ✅ Apenas Preenchidos
            </Button>
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface FiltrosHistoricoVendas {
  termo_busca: string;
  data_inicio: string;
  data_fim: string;
}

interface VendasFiltrosProps {
  filtros: FiltrosHistoricoVendas;
  onAtualizarFiltros: (filtros: Partial<FiltrosHistoricoVendas>) => void;
}

export function VendasFiltros({
  filtros,
  onAtualizarFiltros
}: VendasFiltrosProps) {
  
  // Carregar datas salvas do localStorage ao inicializar
  useEffect(() => {
    const savedDataInicio = localStorage.getItem('vendas-data-inicio');
    const savedDataFim = localStorage.getItem('vendas-data-fim');
    
    if (savedDataInicio && !filtros.data_inicio) {
      onAtualizarFiltros({ data_inicio: savedDataInicio });
    }
    if (savedDataFim && !filtros.data_fim) {
      onAtualizarFiltros({ data_fim: savedDataFim });
    }
  }, []);

  // Salvar datas no localStorage quando mudarem
  const handleDataInicioChange = (date: Date | undefined) => {
    const dateString = date ? format(date, "yyyy-MM-dd") : "";
    onAtualizarFiltros({ data_inicio: dateString });
    if (dateString) {
      localStorage.setItem('vendas-data-inicio', dateString);
    } else {
      localStorage.removeItem('vendas-data-inicio');
    }
  };

  const handleDataFimChange = (date: Date | undefined) => {
    const dateString = date ? format(date, "yyyy-MM-dd") : "";
    onAtualizarFiltros({ data_fim: dateString });
    if (dateString) {
      localStorage.setItem('vendas-data-fim', dateString);
    } else {
      localStorage.removeItem('vendas-data-fim');
    }
  };

  return (
    <Card className="border-slate-700">
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center gap-2">
          <Search className="h-5 w-5" />
          Filtros Avançados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Layout reorganizado: busca esticada + 2 date pickers juntos no final */}
        <div className="flex gap-3">
          {/* Campo de busca esticado */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar Pedido, Sku, Produto..."
              value={filtros.termo_busca}
              onChange={(e) => onAtualizarFiltros({ termo_busca: e.target.value })}
              className="pl-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
            />
          </div>
          
          {/* Date Pickers agrupados no final */}
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[140px] justify-start text-left font-normal bg-slate-800 border-slate-600 text-white hover:bg-slate-700",
                    !filtros.data_inicio && "text-slate-400"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filtros.data_inicio ? format(new Date(filtros.data_inicio), "dd/MM/yyyy") : "Data Início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filtros.data_inicio ? new Date(filtros.data_inicio) : undefined}
                  onSelect={handleDataInicioChange}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[140px] justify-start text-left font-normal bg-slate-800 border-slate-600 text-white hover:bg-slate-700",
                    !filtros.data_fim && "text-slate-400"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filtros.data_fim ? format(new Date(filtros.data_fim), "dd/MM/yyyy") : "Data Fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filtros.data_fim ? new Date(filtros.data_fim) : undefined}
                  onSelect={handleDataFimChange}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center gap-2">
          <Search className="h-5 w-5" />
          Filtros Avançados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros em linha: busca > data início > data fim */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar Pedido, Sku, Produto..."
              value={filtros.termo_busca}
              onChange={(e) => onAtualizarFiltros({ termo_busca: e.target.value })}
              className="pl-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
            />
          </div>
          
          <div>
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
                  {filtros.data_inicio ? format(new Date(filtros.data_inicio), "dd/MM/yyyy") : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filtros.data_inicio ? new Date(filtros.data_inicio) : undefined}
                  onSelect={(date) => onAtualizarFiltros({ data_inicio: date ? format(date, "yyyy-MM-dd") : "" })}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div>
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
                  {filtros.data_fim ? format(new Date(filtros.data_fim), "dd/MM/yyyy") : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filtros.data_fim ? new Date(filtros.data_fim) : undefined}
                  onSelect={(date) => onAtualizarFiltros({ data_fim: date ? format(date, "yyyy-MM-dd") : "" })}
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
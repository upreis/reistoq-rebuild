import { useState } from "react";
import { Search, Filter, RotateCcw, Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface FiltrosPedidosCompactos {
  busca: string;
  dataInicio: string;
  dataFim: string;
  situacoes: string[];
}

interface PedidosFiltrosCompactosProps {
  filtros: FiltrosPedidosCompactos;
  onFiltroChange: (filtros: Partial<FiltrosPedidosCompactos>) => void;
  onLimparFiltros: () => void;
}

export function PedidosFiltrosCompactos({ filtros, onFiltroChange, onLimparFiltros }: PedidosFiltrosCompactosProps) {
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [dataInicio, setDataInicio] = useState<Date | undefined>(
    filtros.dataInicio ? new Date(filtros.dataInicio) : undefined
  );
  const [dataFim, setDataFim] = useState<Date | undefined>(
    filtros.dataFim ? new Date(filtros.dataFim) : undefined
  );

  const situacoes = [
    { value: 'em aberto', label: 'Em Aberto' },
    { value: 'aprovado', label: 'Aprovado' },
    { value: 'preparando envio', label: 'Preparando Envio' },
    { value: 'faturado', label: 'Faturado' },
    { value: 'pronto para envio', label: 'Pronto para Envio' },
    { value: 'enviado', label: 'Enviado' },
    { value: 'entregue', label: 'Entregue' },
    { value: 'cancelado', label: 'Cancelado' },
    { value: 'em separacao', label: 'Em Separação' },
    { value: 'atendido', label: 'Atendido' },
    { value: 'nao entregue', label: 'Não Entregue' }
  ];

  const handleSituacaoChange = (situacao: string, checked: boolean) => {
    const novasSituacoes = checked
      ? [...filtros.situacoes, situacao]
      : filtros.situacoes.filter(s => s !== situacao);
    onFiltroChange({ situacoes: novasSituacoes });
  };

  const handleDataInicioChange = (date: Date | undefined) => {
    setDataInicio(date);
    onFiltroChange({ dataInicio: date ? format(date, 'yyyy-MM-dd') : '' });
  };

  const handleDataFimChange = (date: Date | undefined) => {
    setDataFim(date);
    onFiltroChange({ dataFim: date ? format(date, 'yyyy-MM-dd') : '' });
  };

  const formatPeriodo = () => {
    if (dataInicio && dataFim) {
      return `${format(dataInicio, 'dd MMM', { locale: ptBR })} - ${format(dataFim, 'dd MMM', { locale: ptBR })}`;
    }
    if (dataInicio) {
      return `Desde ${format(dataInicio, 'dd MMM', { locale: ptBR })}`;
    }
    if (dataFim) {
      return `Até ${format(dataFim, 'dd MMM', { locale: ptBR })}`;
    }
    return 'Selecionar período';
  };

  return (
    <div className="space-y-4">
      {/* Filtros Compactos */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border">
        {/* Campo de Busca */}
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Pesquise por cliente ou número"
            className="pl-10 bg-background"
            value={filtros.busca}
            onChange={(e) => onFiltroChange({ busca: e.target.value })}
          />
        </div>

        {/* Seletor de Período */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "min-w-[200px] justify-start text-left font-normal bg-background",
                (!dataInicio && !dataFim) && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatPeriodo()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4 space-y-4">
              <div className="text-sm font-medium">Selecione o período</div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Data Inicial</Label>
                  <Calendar
                    mode="single"
                    selected={dataInicio}
                    onSelect={handleDataInicioChange}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data Final</Label>
                  <Calendar
                    mode="single"
                    selected={dataFim}
                    onSelect={handleDataFimChange}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Botão Filtros */}
        <Collapsible open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="bg-background">
              <Filter className="mr-2 h-4 w-4" />
              filtros
              <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform", filtrosAbertos && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
        </Collapsible>

        {/* Botão Limpar */}
        <Button variant="ghost" onClick={onLimparFiltros} className="text-muted-foreground">
          <RotateCcw className="mr-2 h-4 w-4" />
          limpar filtros
        </Button>
      </div>

      {/* Filtros Expandidos */}
      <Collapsible open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
        <CollapsibleContent className="space-y-4">
          <div className="p-4 bg-muted/20 rounded-lg border">
            <div className="mb-3">
              <Label className="text-sm font-medium">Situações dos Pedidos</Label>
              {filtros.situacoes.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({filtros.situacoes.length} selecionada{filtros.situacoes.length > 1 ? 's' : ''})
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {situacoes.map((situacao) => (
                <div key={situacao.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={situacao.value}
                    checked={filtros.situacoes.includes(situacao.value)}
                    onCheckedChange={(checked) => handleSituacaoChange(situacao.value, checked as boolean)}
                  />
                  <Label
                    htmlFor={situacao.value}
                    className="text-sm font-normal cursor-pointer truncate"
                  >
                    {situacao.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
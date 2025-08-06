import { useState, useEffect } from "react";
import { Search, Filter, RotateCcw, Calendar as CalendarIcon, ChevronDown, Play } from "lucide-react";
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
  dataFinal: string;  // Corrigido de dataFim para dataFinal
  situacoes: string[];
}

interface PedidosFiltrosCompactosProps {
  filtros: FiltrosPedidosCompactos;
  onFiltroChange: (filtros: Partial<FiltrosPedidosCompactos>) => void;
  onLimparFiltros: () => void;
  onBuscarPedidos: () => void;
  loading?: boolean;
}

export function PedidosFiltrosCompactos({ filtros, onFiltroChange, onLimparFiltros, onBuscarPedidos, loading }: PedidosFiltrosCompactosProps) {
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  
  // ✅ Inicialização correta das datas para evitar problemas de timezone
  const [dataInicio, setDataInicio] = useState<Date | undefined>(() => {
    if (filtros.dataInicio) {
      const [ano, mes, dia] = filtros.dataInicio.split('-');
      return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
    }
    return undefined;
  });
  
  const [dataFim, setDataFim] = useState<Date | undefined>(() => {
    if (filtros.dataFinal) {
      const [ano, mes, dia] = filtros.dataFinal.split('-');
      return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
    }
    return undefined;
  });

  // ✅ Sincronizar estado local com filtros vindos do hook
  useEffect(() => {
    // ✅ Corrigir problema de timezone: criar data no horário local
    if (filtros.dataInicio) {
      const [ano, mes, dia] = filtros.dataInicio.split('-');
      setDataInicio(new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia)));
    } else {
      setDataInicio(undefined);
    }
    
    if (filtros.dataFinal) {
      const [ano, mes, dia] = filtros.dataFinal.split('-');
      setDataFim(new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia)));
    } else {
      setDataFim(undefined);
    }
  }, [filtros.dataInicio, filtros.dataFinal]);

  const situacoes = [
    { value: 'Em Aberto', label: 'Em Aberto' },
    { value: 'Aprovado', label: 'Aprovado' },
    { value: 'Preparando Envio', label: 'Preparando Envio' },
    { value: 'Faturado', label: 'Faturado' },
    { value: 'Pronto para Envio', label: 'Pronto para Envio' },
    { value: 'Enviado', label: 'Enviado' },
    { value: 'Entregue', label: 'Entregue' },
    { value: 'Nao Entregue', label: 'Não Entregue' },
    { value: 'Cancelado', label: 'Cancelado' }
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
    onFiltroChange({ dataFinal: date ? format(date, 'yyyy-MM-dd') : '' });
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
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Pesquise por cliente ou número"
            className="pl-10 bg-background"
            value={filtros.busca}
            onChange={(e) => onFiltroChange({ busca: e.target.value })}
          />
        </div>

        {/* Seletores de Período - Separados */}
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "min-w-[120px] justify-start text-left font-normal bg-background",
                  !dataInicio && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dataInicio ? format(dataInicio, 'dd/MM/yyyy') : 'Data Inicial'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dataInicio}
                onSelect={handleDataInicioChange}
                defaultMonth={dataInicio}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "min-w-[120px] justify-start text-left font-normal bg-background",
                  !dataFim && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dataFim ? format(dataFim, 'dd/MM/yyyy') : 'Data Final'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dataFim}
                onSelect={handleDataFimChange}
                defaultMonth={dataFim}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

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

        {/* Botão Buscar Pedidos - Destaque */}
        <Button 
          onClick={onBuscarPedidos} 
          disabled={loading}
          className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold min-w-[140px] shadow-lg"
        >
          <Play className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Buscando...' : 'Buscar Pedidos'}
        </Button>

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
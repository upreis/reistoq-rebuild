import { useState, useEffect } from "react";
import { Search, Filter, RotateCcw, Calendar as CalendarIcon, ChevronDown, Play, Star, Save, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface FiltrosAvancados {
  busca: string;
  dataInicio: string;
  dataFinal: string;
  situacoes: string[];
  valorMinimo: number;
  valorMaximo: number;
  clienteVip: boolean;
}

interface FiltrosSalvos {
  id: string;
  nome: string;
  filtros: FiltrosAvancados;
  data_criacao: string;
}

interface FiltrosAvancadosPedidosProps {
  filtros: FiltrosAvancados;
  onFiltroChange: (filtros: Partial<FiltrosAvancados>) => void;
  onLimparFiltros: () => void;
  onBuscarPedidos: () => void;
  loading?: boolean;
}

export function FiltrosAvancadosPedidos({ 
  filtros, 
  onFiltroChange, 
  onLimparFiltros, 
  onBuscarPedidos, 
  loading 
}: FiltrosAvancadosPedidosProps) {
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [filtrosSalvos, setFiltrosSalvos] = useState<FiltrosSalvos[]>([]);
  const [nomeFiltro, setNomeFiltro] = useState("");
  const [mostrarSalvarFiltro, setMostrarSalvarFiltro] = useState(false);
  
  // Estados para datas
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

  // Carregar filtros salvos do localStorage
  useEffect(() => {
    const filtrosSalvosStr = localStorage.getItem('filtros-pedidos-salvos');
    if (filtrosSalvosStr) {
      setFiltrosSalvos(JSON.parse(filtrosSalvosStr));
    }
  }, []);

  // Sincronizar datas com filtros
  useEffect(() => {
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

  const salvarFiltro = () => {
    if (!nomeFiltro.trim()) return;
    
    const novoFiltro: FiltrosSalvos = {
      id: Date.now().toString(),
      nome: nomeFiltro,
      filtros: { ...filtros },
      data_criacao: new Date().toISOString()
    };
    
    const novosFiltrosSalvos = [...filtrosSalvos, novoFiltro];
    setFiltrosSalvos(novosFiltrosSalvos);
    localStorage.setItem('filtros-pedidos-salvos', JSON.stringify(novosFiltrosSalvos));
    setNomeFiltro("");
    setMostrarSalvarFiltro(false);
  };

  const aplicarFiltroSalvo = (filtroSalvo: FiltrosSalvos) => {
    onFiltroChange(filtroSalvo.filtros);
  };

  const removerFiltroSalvo = (id: string) => {
    const novosFiltrosSalvos = filtrosSalvos.filter(f => f.id !== id);
    setFiltrosSalvos(novosFiltrosSalvos);
    localStorage.setItem('filtros-pedidos-salvos', JSON.stringify(novosFiltrosSalvos));
  };

  const contarFiltrosAtivos = () => {
    let count = 0;
    if (filtros.busca) count++;
    if (filtros.dataInicio || filtros.dataFinal) count++;
    if (filtros.situacoes.length > 0) count++;
    if (filtros.valorMinimo > 0 || filtros.valorMaximo > 0) count++;
    if (filtros.clienteVip) count++;
    return count;
  };

  return (
    <div className="space-y-4">
      {/* Filtros Salvos */}
      {filtrosSalvos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Label className="text-sm font-medium flex items-center">
            <Star className="mr-1 h-3 w-3" />
            Filtros Favoritos:
          </Label>
          {filtrosSalvos.map((filtroSalvo) => (
            <Badge 
              key={filtroSalvo.id}
              variant="outline" 
              className="cursor-pointer hover:bg-primary/10 group"
              onClick={() => aplicarFiltroSalvo(filtroSalvo)}
            >
              {filtroSalvo.nome}
              <X 
                className="ml-1 h-3 w-3 opacity-0 group-hover:opacity-100 hover:text-red-500" 
                onClick={(e) => {
                  e.stopPropagation();
                  removerFiltroSalvo(filtroSalvo.id);
                }}
              />
            </Badge>
          ))}
        </div>
      )}

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

        {/* Seletores de Período */}
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
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Botão Filtros Avançados */}
        <Collapsible open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="bg-background relative">
              <Filter className="mr-2 h-4 w-4" />
              Filtros Avançados
              {contarFiltrosAtivos() > 0 && (
                <Badge className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                  {contarFiltrosAtivos()}
                </Badge>
              )}
              <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform", filtrosAbertos && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
        </Collapsible>

        {/* Botão Salvar Filtro */}
        {contarFiltrosAtivos() > 0 && (
          <Button
            variant="outline"
            onClick={() => setMostrarSalvarFiltro(!mostrarSalvarFiltro)}
            className="bg-background"
          >
            <Save className="mr-2 h-4 w-4" />
            Salvar
          </Button>
        )}

        {/* Botão Buscar Pedidos */}
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
          Limpar
        </Button>
      </div>

      {/* Campo para salvar filtro */}
      {mostrarSalvarFiltro && (
        <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border">
          <Input
            placeholder="Nome do filtro favorito"
            value={nomeFiltro}
            onChange={(e) => setNomeFiltro(e.target.value)}
            className="flex-1"
          />
          <Button onClick={salvarFiltro} disabled={!nomeFiltro.trim()}>
            <Save className="mr-2 h-4 w-4" />
            Salvar
          </Button>
          <Button variant="ghost" onClick={() => setMostrarSalvarFiltro(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Filtros Expandidos */}
      <Collapsible open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
        <CollapsibleContent className="space-y-4">
          <div className="grid gap-4 p-4 bg-muted/20 rounded-lg border">
            
            {/* Situações dos Pedidos */}
            <div>
              <Label className="text-sm font-medium mb-3 block">
                Situações dos Pedidos
                {filtros.situacoes.length > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({filtros.situacoes.length} selecionada{filtros.situacoes.length > 1 ? 's' : ''})
                  </span>
                )}
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {situacoes.map((situacao) => (
                  <div key={situacao.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={situacao.value}
                      checked={filtros.situacoes.includes(situacao.value)}
                      onCheckedChange={(checked) => handleSituacaoChange(situacao.value, checked as boolean)}
                    />
                    <Label htmlFor={situacao.value} className="text-sm font-normal cursor-pointer truncate">
                      {situacao.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Filtro por Valor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Valor Mínimo (R$)</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={filtros.valorMinimo || ''}
                  onChange={(e) => onFiltroChange({ valorMinimo: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Valor Máximo (R$)</Label>
                <Input
                  type="number"
                  placeholder="1000,00"
                  value={filtros.valorMaximo || ''}
                  onChange={(e) => onFiltroChange({ valorMaximo: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <Separator />

            {/* Cliente VIP */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="cliente-vip"
                checked={filtros.clienteVip}
                onCheckedChange={(checked) => onFiltroChange({ clienteVip: checked as boolean })}
              />
              <Label htmlFor="cliente-vip" className="text-sm font-medium cursor-pointer flex items-center">
                <Star className="mr-1 h-4 w-4 text-yellow-500" />
                Apenas clientes VIP (pedidos acima de R$ 500)
              </Label>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
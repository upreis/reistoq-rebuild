import { Filter, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface FiltrosPedidosAvancados {
  dataInicio: string;
  dataFim: string;
  situacoes: string[];
}

interface PedidosFiltrosAvancadosProps {
  filtros: FiltrosPedidosAvancados;
  onFiltroChange: (filtros: Partial<FiltrosPedidosAvancados>) => void;
  onLimparFiltros: () => void;
}

export function PedidosFiltrosAvancados({ filtros, onFiltroChange, onLimparFiltros }: PedidosFiltrosAvancadosProps) {
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

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros Avançados
        </CardTitle>
        <CardDescription>
          Filtre pedidos por período e situações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Filtros de data */}
          <div className="flex gap-4 lg:flex-1">
            <div className="flex-1">
              <Label htmlFor="dataInicio" className="text-sm font-medium">Data Inicial</Label>
              <Input
                id="dataInicio"
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => onFiltroChange({ dataInicio: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="dataFim" className="text-sm font-medium">Data Final</Label>
              <Input
                id="dataFim"
                type="date"
                value={filtros.dataFim}
                onChange={(e) => onFiltroChange({ dataFim: e.target.value })}
              />
            </div>
          </div>

          {/* Botão limpar filtros */}
          <div className="flex items-end">
            <Button variant="outline" onClick={onLimparFiltros}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Limpar Filtros
            </Button>
          </div>
        </div>

        {/* Situações (múltipla seleção) */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Situações dos Pedidos</Label>
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
          {filtros.situacoes.length > 0 && (
            <div className="text-sm text-muted-foreground mt-2">
              {filtros.situacoes.length} situação(ões) selecionada(s)
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
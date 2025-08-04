import { Search, Filter, RotateCcw, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface FiltrosPedidosAvancados {
  busca: string;
  cliente: string;
  dataInicio: string;
  dataFim: string;
  situacoes: string[];
  sku: string;
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
          Busque itens por pedido, cliente, SKU, período ou múltiplas situações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Linha 1: Buscas textuais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Número pedido, descrição..."
              className="pl-10"
              value={filtros.busca}
              onChange={(e) => onFiltroChange({ busca: e.target.value })}
            />
          </div>
          
          <Input
            placeholder="Nome do cliente..."
            value={filtros.cliente}
            onChange={(e) => onFiltroChange({ cliente: e.target.value })}
          />

          <div className="relative">
            <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="SKU do produto..."
              className="pl-10"
              value={filtros.sku}
              onChange={(e) => onFiltroChange({ sku: e.target.value })}
            />
          </div>
        </div>

        {/* Linha 2: Filtros de data */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dataInicio" className="text-sm font-medium">Data Inicial</Label>
            <Input
              id="dataInicio"
              type="date"
              value={filtros.dataInicio}
              onChange={(e) => onFiltroChange({ dataInicio: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="dataFim" className="text-sm font-medium">Data Final</Label>
            <Input
              id="dataFim"
              type="date"
              value={filtros.dataFim}
              onChange={(e) => onFiltroChange({ dataFim: e.target.value })}
            />
          </div>
        </div>

        {/* Linha 3: Situações (múltipla seleção) */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Situações dos Pedidos</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {situacoes.map((situacao) => (
              <div key={situacao.value} className="flex items-center space-x-2">
                <Checkbox
                  id={situacao.value}
                  checked={filtros.situacoes.includes(situacao.value)}
                  onCheckedChange={(checked) => handleSituacaoChange(situacao.value, checked as boolean)}
                />
                <Label
                  htmlFor={situacao.value}
                  className="text-sm font-normal cursor-pointer"
                >
                  {situacao.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Ações */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {filtros.situacoes.length > 0 && (
              <span>{filtros.situacoes.length} situação(ões) selecionada(s)</span>
            )}
          </div>
          <Button variant="outline" onClick={onLimparFiltros}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Limpar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
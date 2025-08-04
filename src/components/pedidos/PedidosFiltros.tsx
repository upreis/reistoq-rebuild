import { Search, Filter, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PedidosFiltrosProps {
  filtros: {
    busca: string;
    cliente: string;
    dataInicio: string;
    dataFim: string;
    situacao: string;
  };
  onFiltroChange: (filtros: any) => void;
  onLimparFiltros: () => void;
}

export function PedidosFiltros({ filtros, onFiltroChange, onLimparFiltros }: PedidosFiltrosProps) {
  const situacoes = [
    { value: 'todas', label: 'Todas as situações' },
    { value: 'pendente', label: 'Pendente' },
    { value: 'processado', label: 'Processado' },
    { value: 'enviado', label: 'Enviado' },
    { value: 'entregue', label: 'Entregue' },
    { value: 'cancelado', label: 'Cancelado' }
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros de Busca
        </CardTitle>
        <CardDescription>
          Busque pedidos por número, cliente, período ou situação
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Número do pedido..."
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

          <Input
            type="date"
            placeholder="Data inicial"
            value={filtros.dataInicio}
            onChange={(e) => onFiltroChange({ dataInicio: e.target.value })}
          />

          <Input
            type="date"
            placeholder="Data final"
            value={filtros.dataFim}
            onChange={(e) => onFiltroChange({ dataFim: e.target.value })}
          />

          <Select
            value={filtros.situacao}
            onValueChange={(value) => onFiltroChange({ situacao: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              {situacoes.map((situacao) => (
                <SelectItem key={situacao.value} value={situacao.value}>
                  {situacao.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onLimparFiltros}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Limpar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
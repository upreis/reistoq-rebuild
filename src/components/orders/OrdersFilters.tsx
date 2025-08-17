import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, X, Filter } from "lucide-react";
import type { ListParams, Fonte } from "@/types/orders";

const SITUACOES_OPTIONS = [
  'Em Aberto',
  'Aprovado', 
  'Preparando Envio',
  'Faturado',
  'Pronto para Envio',
  'Enviado',
  'Entregue',
  'Nao Entregue',
  'Cancelado'
];

const FONTE_OPTIONS: { value: Fonte; label: string }[] = [
  { value: 'interno', label: 'Interno (Tiny)' },
  { value: 'mercadolivre', label: 'Mercado Livre' },
  { value: 'ambas', label: 'Ambas as fontes' }
];

interface OrdersFiltersProps {
  filters: ListParams;
  onFiltersChange: (filters: Partial<ListParams>) => void;
  onSearchChange: (q: string) => void;
  onClear: () => void;
}

export function OrdersFilters({
  filters,
  onFiltersChange,
  onSearchChange,
  onClear
}: OrdersFiltersProps) {
  
  const handleSituacaoToggle = (situacao: string) => {
    const current = filters.situacoes || [];
    const updated = current.includes(situacao)
      ? current.filter(s => s !== situacao)
      : [...current, situacao];
    
    onFiltersChange({ situacoes: updated, page: 1 });
  };

  const removeSituacao = (situacao: string) => {
    const updated = (filters.situacoes || []).filter(s => s !== situacao);
    onFiltersChange({ situacoes: updated, page: 1 });
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Linha 1: Busca e Fonte */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="search">Buscar pedidos</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Número do pedido, cliente, SKU ou descrição..."
                value={filters.q || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="fonte">Fonte de dados</Label>
            <Select
              value={filters.fonte || 'interno'}
              onValueChange={(value: Fonte) => onFiltersChange({ fonte: value, page: 1 })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONTE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Linha 2: Período */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="from">Data inicial</Label>
            <Input
              id="from"
              type="date"
              value={filters.from || ''}
              onChange={(e) => onFiltersChange({ from: e.target.value, page: 1 })}
            />
          </div>
          
          <div>
            <Label htmlFor="to">Data final</Label>
            <Input
              id="to"
              type="date"
              value={filters.to || ''}
              onChange={(e) => onFiltersChange({ to: e.target.value, page: 1 })}
            />
          </div>
        </div>

        {/* Linha 3: Situações */}
        <div>
          <Label>Situações do pedido</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {SITUACOES_OPTIONS.map(situacao => {
              const isSelected = (filters.situacoes || []).includes(situacao);
              return (
                <Badge
                  key={situacao}
                  variant={isSelected ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => handleSituacaoToggle(situacao)}
                >
                  {situacao}
                </Badge>
              );
            })}
          </div>
          
          {/* Situações selecionadas */}
          {filters.situacoes && filters.situacoes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {filters.situacoes.map(situacao => (
                <Badge key={situacao} variant="secondary" className="text-xs">
                  {situacao}
                  <X 
                    className="ml-1 h-3 w-3 cursor-pointer" 
                    onClick={() => removeSituacao(situacao)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Linha 4: Ações */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClear} size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Limpar filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
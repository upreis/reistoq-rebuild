import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

interface FiltrosHistoricoVendas {
  termo_busca: string;
  status: string;
  data_inicio: string;
  data_fim: string;
  cliente: string;
}

interface VendasFiltrosProps {
  filtros: FiltrosHistoricoVendas;
  onAtualizarFiltros: (filtros: Partial<FiltrosHistoricoVendas>) => void;
  onLimparFiltros: () => void;
}

export function VendasFiltros({
  filtros,
  onAtualizarFiltros,
  onLimparFiltros
}: VendasFiltrosProps) {
  const temFiltrosAtivos = Object.values(filtros).some(valor => valor !== '');

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filtros</CardTitle>
          {temFiltrosAtivos && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onLimparFiltros}
              className="h-8 px-2"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label htmlFor="busca" className="text-sm font-medium">
              Buscar
            </label>
            <Input
              id="busca"
              placeholder="Nº pedido, SKU, produto..."
              value={filtros.termo_busca}
              onChange={(e) => onAtualizarFiltros({ termo_busca: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="status" className="text-sm font-medium">
              Status
            </label>
            <Select 
              value={filtros.status || "all"} 
              onValueChange={(value) => onAtualizarFiltros({ status: value === "all" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
                <SelectItem value="processando">Processando</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="cliente" className="text-sm font-medium">
              Cliente
            </label>
            <Input
              id="cliente"
              placeholder="Nome ou documento..."
              value={filtros.cliente}
              onChange={(e) => onAtualizarFiltros({ cliente: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="data-inicio" className="text-sm font-medium">
              Data Início
            </label>
            <Input
              id="data-inicio"
              type="date"
              value={filtros.data_inicio}
              onChange={(e) => onAtualizarFiltros({ data_inicio: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="data-fim" className="text-sm font-medium">
              Data Fim
            </label>
            <Input
              id="data-fim"
              type="date"
              value={filtros.data_fim}
              onChange={(e) => onAtualizarFiltros({ data_fim: e.target.value })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
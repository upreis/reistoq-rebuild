import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";

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
  const handleStatusFilter = (status: string) => {
    onAtualizarFiltros({ status: status === 'all' ? '' : status });
  };

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center gap-2">
          <Search className="h-5 w-5" />
          Filtros Avançados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Campo de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nº pedido, SKU, produto ou cliente..."
            value={filtros.termo_busca}
            onChange={(e) => onAtualizarFiltros({ termo_busca: e.target.value })}
            className="pl-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
          />
        </div>

        {/* Botões de filtro rápido */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={!filtros.status ? "default" : "outline"}
            size="sm"
            onClick={() => handleStatusFilter('all')}
            className={!filtros.status ? "bg-yellow-500 text-black hover:bg-yellow-600" : "border-slate-600 text-slate-300 hover:bg-slate-700"}
          >
            📊 Mostrar Todos
          </Button>
          
          <Button
            variant={filtros.status === 'pendente' ? "default" : "outline"}
            size="sm"
            onClick={() => handleStatusFilter('pendente')}
            className={filtros.status === 'pendente' ? "bg-yellow-500 text-black hover:bg-yellow-600" : "border-slate-600 text-slate-300 hover:bg-slate-700"}
          >
            ⚠️ Apenas Pendentes
          </Button>
          
          <Button
            variant={filtros.status === 'concluida' ? "default" : "outline"}
            size="sm"
            onClick={() => handleStatusFilter('concluida')}
            className={filtros.status === 'concluida' ? "bg-yellow-500 text-black hover:bg-yellow-600" : "border-slate-600 text-slate-300 hover:bg-slate-700"}
          >
            ✅ Apenas Concluídas
          </Button>
        </div>

        {/* Filtros adicionais em linha */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-sm text-slate-300">Cliente</label>
            <Input
              placeholder="Nome ou documento..."
              value={filtros.cliente}
              onChange={(e) => onAtualizarFiltros({ cliente: e.target.value })}
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-sm text-slate-300">Data Início</label>
            <Input
              type="date"
              value={filtros.data_inicio}
              onChange={(e) => onAtualizarFiltros({ data_inicio: e.target.value })}
              className="bg-slate-800 border-slate-600 text-white"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-sm text-slate-300">Data Fim</label>
            <Input
              type="date"
              value={filtros.data_fim}
              onChange={(e) => onAtualizarFiltros({ data_fim: e.target.value })}
              className="bg-slate-800 border-slate-600 text-white"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
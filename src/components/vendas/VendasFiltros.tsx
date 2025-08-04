import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";

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
          
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Data Início</label>
            <Input
              type="date"
              value={filtros.data_inicio}
              onChange={(e) => onAtualizarFiltros({ data_inicio: e.target.value })}
              className="bg-slate-800 border-slate-600 text-white"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Data Fim</label>
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
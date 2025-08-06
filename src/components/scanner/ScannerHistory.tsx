import { useState } from "react";
import { Calendar, Filter, ScanLine, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ScanHistory {
  codigo: string;
  produto?: string;
  found: boolean;
  timestamp: Date;
}

interface ScannerHistoryProps {
  scanHistory: ScanHistory[];
}

export function ScannerHistory({ scanHistory }: ScannerHistoryProps) {
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [dateFilter, setDateFilter] = useState<string>("todos");

  const filteredHistory = scanHistory.filter(item => {
    const matchesSearch = searchFilter === "" || 
      item.codigo.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (item.produto && item.produto.toLowerCase().includes(searchFilter.toLowerCase()));
    
    const matchesStatus = statusFilter === "todos" || 
      (statusFilter === "encontrados" && item.found) ||
      (statusFilter === "nao-encontrados" && !item.found);
    
    const itemDate = new Date(item.timestamp);
    const matchesDate = dateFilter === "todos" ||
      (dateFilter === "hoje" && isToday(itemDate)) ||
      (dateFilter === "ontem" && isYesterday(itemDate)) ||
      (dateFilter === "esta-semana" && 
        new Date().getTime() - itemDate.getTime() <= 7 * 24 * 60 * 60 * 1000);
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const clearFilters = () => {
    setSearchFilter("");
    setStatusFilter("todos");
    setDateFilter("todos");
  };

  const hasActiveFilters = searchFilter !== "" || statusFilter !== "todos" || dateFilter !== "todos";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Histórico de Códigos</CardTitle>
            <CardDescription>
              Últimos códigos escaneados ({filteredHistory.length} de {scanHistory.length})
            </CardDescription>
          </div>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
          )}
        </div>
        
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar código ou produto..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="encontrados">Encontrados</SelectItem>
              <SelectItem value="nao-encontrados">Não encontrados</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os períodos</SelectItem>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="ontem">Ontem</SelectItem>
              <SelectItem value="esta-semana">Esta semana</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <ScanLine className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-mono text-sm text-foreground">{item.codigo}</p>
                    <p className={`text-sm ${item.found ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {item.produto || 'Produto não identificado'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">
                    {format(new Date(item.timestamp), "dd/MM HH:mm")}
                  </p>
                  <Badge 
                    variant={item.found ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {item.found ? "Encontrado" : "Não encontrado"}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <ScanLine className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                {hasActiveFilters ? "Nenhum resultado encontrado com os filtros aplicados" : "Nenhum código escaneado ainda"}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StatusItem {
  label: string;
  count: number;
  key: string;
  color: string;
}

interface PedidosBarraStatusProps {
  itens: any[];
  filtroAtivo: string;
  onFiltroChange: (filtro: string) => void;
  obterStatusEstoque?: (item: any) => string;
}

export function PedidosBarraStatus({ 
  itens, 
  filtroAtivo, 
  onFiltroChange,
  obterStatusEstoque 
}: PedidosBarraStatusProps) {
  const calcularStatus = () => {
    const total = itens.length;
    const problemas = itens.filter(item => {
      if (!obterStatusEstoque) return false;
      const status = obterStatusEstoque(item);
      return status === 'Sem Estoque' || status === 'Sem Mapeamento';
    }).length;
    
    const urgentes = itens.filter(item => item.prioridade === 'urgente').length;
    const processados = itens.filter(item => {
      if (!obterStatusEstoque) return false;
      const status = obterStatusEstoque(item);
      return status === 'Processado';
    }).length;
    
    const semEstoque = itens.filter(item => {
      if (!obterStatusEstoque) return false;
      return obterStatusEstoque(item) === 'Sem Estoque';
    }).length;
    
    const semMapeamento = itens.filter(item => {
      if (!obterStatusEstoque) return false;
      return obterStatusEstoque(item) === 'Sem Mapeamento';
    }).length;
    
    const disponivel = itens.filter(item => {
      if (!obterStatusEstoque) return false;
      const status = obterStatusEstoque(item);
      return status === 'Disponível' || status === 'Estoque Baixo';
    }).length;

    return {
      total,
      problemas,
      urgentes,
      processados,
      semEstoque,
      semMapeamento,
      disponivel
    };
  };

  const status = calcularStatus();

  const statusItems: StatusItem[] = [
    { label: "todos", count: status.total, key: "todos", color: "bg-muted text-muted-foreground" },
    { label: "com problemas", count: status.problemas, key: "problemas", color: "bg-destructive/10 text-destructive border-destructive/20" },
    { label: "urgentes", count: status.urgentes, key: "urgentes", color: "bg-orange-100 text-orange-700 border-orange-200" },
    { label: "disponível", count: status.disponivel, key: "disponivel", color: "bg-green-100 text-green-700 border-green-200" },
    { label: "processados", count: status.processados, key: "processados", color: "bg-blue-100 text-blue-700 border-blue-200" },
    { label: "sem estoque", count: status.semEstoque, key: "sem_estoque", color: "bg-red-100 text-red-700 border-red-200" },
    { label: "sem mapeamento", count: status.semMapeamento, key: "sem_mapeamento", color: "bg-yellow-100 text-yellow-700 border-yellow-200" }
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-background border-b border-border">
      {statusItems.map((item) => (
        <Button
          key={item.key}
          variant="ghost"
          size="sm"
          onClick={() => onFiltroChange(item.key)}
          className={cn(
            "h-8 px-3 transition-all duration-200 hover:scale-105",
            filtroAtivo === item.key 
              ? item.color + " font-medium" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <span className="text-xs font-medium">{item.label}</span>
          <Badge 
            variant="secondary" 
            className={cn(
              "ml-2 h-5 min-w-[20px] text-xs font-bold",
              filtroAtivo === item.key 
                ? "bg-background/20 text-current" 
                : "bg-muted text-muted-foreground"
            )}
          >
            {item.count}
          </Badge>
        </Button>
      ))}
    </div>
  );
}
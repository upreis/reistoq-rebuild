import { History, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface HistoricoMetricas {
  total_movimentacoes: number;
  entradas_hoje: number;
  saidas_hoje: number;
  valor_movimentado: number;
}

interface HistoricoMetricasProps {
  metricas: HistoricoMetricas;
  loading: boolean;
}

export function HistoricoMetricas({ metricas, loading }: HistoricoMetricasProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card className="hover:shadow-elegant transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total de Movimentações
          </CardTitle>
          <History className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {metricas.total_movimentacoes.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Movimentações registradas
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-elegant transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Entradas Hoje
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {metricas.entradas_hoje.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Produtos recebidos
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-elegant transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Saídas Hoje
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {metricas.saidas_hoje.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Produtos enviados
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-elegant transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Itens Movimentados
          </CardTitle>
          <Activity className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {metricas.valor_movimentado.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Quantidade total
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
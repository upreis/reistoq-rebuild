import { Package, AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EstoqueMetricas as IEstoqueMetricas } from "@/hooks/useEstoque";

interface EstoqueMetricasProps {
  metricas: IEstoqueMetricas;
  loading: boolean;
}

export function EstoqueMetricas({ metricas, loading }: EstoqueMetricasProps) {
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="hover:shadow-elegant transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total de Produtos
          </CardTitle>
          <Package className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-2xl font-bold text-foreground">{metricas.totalProdutos.toLocaleString()}</div>
          )}
          <p className="text-xs text-muted-foreground">
            Produtos cadastrados
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-elegant transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Produtos em Alerta
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-accent" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-2xl font-bold text-foreground">{metricas.produtosAlerta}</div>
          )}
          <p className="text-xs text-muted-foreground">
            Estoque baixo ou crítico
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-elegant transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Valor Total Estoque
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-secondary" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <div className="text-2xl font-bold text-foreground">
              {formatarMoeda(metricas.valorTotalEstoque)}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Valor total em estoque
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
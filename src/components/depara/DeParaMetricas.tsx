import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeftRight, CheckCircle, XCircle } from "lucide-react";
import { DeParaMetricas as MetricasType } from "@/hooks/useDePara";

interface DeParaMetricasProps {
  metricas: MetricasType;
  loading: boolean;
}

export function DeParaMetricas({ metricas, loading }: DeParaMetricasProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metricas_cards = [
    {
      titulo: "Total de Mapeamentos",
      valor: metricas.totalMapeamentos,
      icone: ArrowLeftRight,
      cor: "text-primary",
      bgCor: "bg-primary/10"
    },
    {
      titulo: "Mapeamentos Ativos",
      valor: metricas.mapeamentosAtivos,
      icone: CheckCircle,
      cor: "text-green-600",
      bgCor: "bg-green-100"
    },
    {
      titulo: "Mapeamentos Inativos",
      valor: metricas.mapeamentosInativos,
      icone: XCircle,
      cor: "text-red-600",
      bgCor: "bg-red-100"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {metricas_cards.map((metrica, index) => (
        <Card key={index} className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metrica.titulo}
            </CardTitle>
            <div className={`p-2 rounded-lg ${metrica.bgCor}`}>
              <metrica.icone className={`h-4 w-4 ${metrica.cor}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrica.cor}`}>
              {metrica.valor.toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
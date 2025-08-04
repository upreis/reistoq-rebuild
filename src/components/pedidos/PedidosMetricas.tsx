import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Clock, CheckCircle, DollarSign } from "lucide-react";

interface PedidosMetricasProps {
  metricas: {
    totalItens: number;
    totalPedidos: number;
    pedidosPendentes: number;
    pedidosAprovados: number;
    pedidosEnviados: number;
    pedidosEntregues: number;
    valorTotal: number;
  };
}

export function PedidosMetricas({ metricas }: PedidosMetricasProps) {
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const cardsMetricas = [
    {
      titulo: "Total de Itens",
      valor: metricas.totalItens.toString(),
      icone: Package,
      cor: "text-blue-600"
    },
    {
      titulo: "Total de Pedidos",
      valor: metricas.totalPedidos.toString(),
      icone: Package,
      cor: "text-blue-600"
    },
    {
      titulo: "Pendentes",
      valor: metricas.pedidosPendentes.toString(),
      icone: Clock,
      cor: "text-yellow-600"
    },
    {
      titulo: "Aprovados",
      valor: metricas.pedidosAprovados.toString(),
      icone: CheckCircle,
      cor: "text-orange-600"
    },
    {
      titulo: "Enviados",
      valor: metricas.pedidosEnviados.toString(),
      icone: CheckCircle,
      cor: "text-green-600"
    },
    {
      titulo: "Entregues",
      valor: metricas.pedidosEntregues.toString(),
      icone: CheckCircle,
      cor: "text-emerald-600"
    },
    {
      titulo: "Valor Total",
      valor: formatarMoeda(metricas.valorTotal),
      icone: DollarSign,
      cor: "text-purple-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cardsMetricas.map((metrica, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metrica.titulo}
            </CardTitle>
            <metrica.icone className={`h-4 w-4 ${metrica.cor}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrica.valor}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
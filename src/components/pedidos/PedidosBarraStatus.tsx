import { Package, Clock, CheckCircle, DollarSign } from "lucide-react";

interface PedidosBarraStatusProps {
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

export function PedidosBarraStatus({ metricas }: PedidosBarraStatusProps) {
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const itensStatus = [
    {
      label: "Total de Itens",
      valor: metricas.totalItens.toString(),
      icone: Package,
      cor: "text-primary"
    },
    {
      label: "Total de Pedidos", 
      valor: metricas.totalPedidos.toString(),
      icone: Package,
      cor: "text-primary"
    },
    {
      label: "Pendentes",
      valor: metricas.pedidosPendentes.toString(),
      icone: Clock,
      cor: "text-accent"
    },
    {
      label: "Aprovados",
      valor: metricas.pedidosAprovados.toString(),
      icone: CheckCircle,
      cor: "text-orange-500"
    },
    {
      label: "Enviados",
      valor: metricas.pedidosEnviados.toString(),
      icone: CheckCircle,
      cor: "text-secondary"
    },
    {
      label: "Entregues",
      valor: metricas.pedidosEntregues.toString(),
      icone: CheckCircle,
      cor: "text-secondary"
    },
    {
      label: "Valor Total",
      valor: formatarMoeda(metricas.valorTotal),
      icone: DollarSign,
      cor: "text-purple-500"
    }
  ];

  return (
    <div className="bg-card/50 border border-border rounded-lg p-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {itensStatus.map((item, index) => (
          <div key={index} className="flex items-center gap-2 min-w-0">
            <item.icone className={`h-4 w-4 ${item.cor} flex-shrink-0`} />
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground truncate">{item.label}</div>
              <div className="text-sm font-semibold text-foreground truncate">{item.valor}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
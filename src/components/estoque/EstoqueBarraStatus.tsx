import { Package, AlertTriangle, TrendingUp } from "lucide-react";
import { EstoqueMetricas } from "@/hooks/useEstoque";

interface EstoqueBarraStatusProps {
  metricas: EstoqueMetricas;
}

export function EstoqueBarraStatus({ metricas }: EstoqueBarraStatusProps) {
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const itensStatus = [
    {
      label: "Total de Produtos",
      valor: metricas.totalProdutos.toString(),
      icone: Package,
      cor: "text-primary"
    },
    {
      label: "Produtos em Alerta",
      valor: metricas.produtosAlerta.toString(),
      icone: AlertTriangle,
      cor: "text-accent"
    },
    {
      label: "Valor Total",
      valor: formatarMoeda(metricas.valorTotalEstoque),
      icone: TrendingUp,
      cor: "text-secondary"
    }
  ];

  return (
    <div className="bg-card/50 border border-border rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
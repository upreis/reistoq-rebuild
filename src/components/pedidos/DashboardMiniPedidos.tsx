import { AlertTriangle, TrendingUp, Clock, CheckCircle, XCircle, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ItemPedidoEnriquecido } from "@/hooks/useDeParaIntegration";

interface DashboardMiniPedidosProps {
  itens: ItemPedidoEnriquecido[];
  obterStatusEstoque?: (item: ItemPedidoEnriquecido) => string;
}

export function DashboardMiniPedidos({ itens, obterStatusEstoque }: DashboardMiniPedidosProps) {
  
  // Calcular métricas
  const calcularMetricas = () => {
    const total = itens.length;
    let comProblema = 0;
    let valorEmRisco = 0;
    let prontosBaixar = 0;
    let estoqueBaixado = 0;
    let semEstoque = 0;
    let semMapeamento = 0;
    let urgentes = 0;

    itens.forEach(item => {
      const status = obterStatusEstoque ? obterStatusEstoque(item) : 'unknown';
      
      // Calcular problemas
      if (status === 'sem-estoque' || status === 'sem-mapeamento') {
        comProblema++;
        valorEmRisco += item.valor_total || 0;
      }

      // Contar por status
      switch (status) {
        case 'disponivel':
          prontosBaixar++;
          break;
        case 'processado':
          estoqueBaixado++;
          break;
        case 'sem-estoque':
          semEstoque++;
          break;
        case 'sem-mapeamento':
          semMapeamento++;
          break;
      }

      // Verificar urgência (mais de 3 dias)
      const dataPedido = new Date(item.data_pedido);
      const diasAtras = Math.floor((new Date().getTime() - dataPedido.getTime()) / (1000 * 60 * 60 * 24));
      if (diasAtras > 3) {
        urgentes++;
      }
    });

    return {
      total,
      comProblema,
      valorEmRisco,
      prontosBaixar,
      estoqueBaixado,
      semEstoque,
      semMapeamento,
      urgentes,
      percentualSucesso: total > 0 ? Math.round((estoqueBaixado / total) * 100) : 0
    };
  };

  const metricas = calcularMetricas();

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 mb-6">
      {/* Card de Problemas */}
      <Card className={`${metricas.comProblema > 0 ? 'border-red-200 bg-red-50 dark:bg-red-900/10' : ''}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pedidos com Problema</CardTitle>
          <AlertTriangle className={`h-4 w-4 ${metricas.comProblema > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{metricas.comProblema}</div>
          <p className="text-xs text-muted-foreground">
            {metricas.valorEmRisco > 0 && `${formatarMoeda(metricas.valorEmRisco)} em risco`}
          </p>
          {metricas.comProblema > 0 && (
            <div className="flex gap-1 mt-2">
              <Badge variant="destructive" className="text-xs">
                {metricas.semEstoque} sem estoque
              </Badge>
              <Badge variant="destructive" className="text-xs">
                {metricas.semMapeamento} sem mapear
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card de Urgentes */}
      <Card className={`${metricas.urgentes > 0 ? 'border-orange-200 bg-orange-50 dark:bg-orange-900/10' : ''}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pedidos Urgentes</CardTitle>
          <Clock className={`h-4 w-4 ${metricas.urgentes > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{metricas.urgentes}</div>
          <p className="text-xs text-muted-foreground">
            Há mais de 3 dias
          </p>
          {metricas.urgentes > 0 && (
            <Badge variant="outline" className="text-xs mt-2 border-orange-300 text-orange-700">
              Precisam atenção
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Card de Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metricas.total}</div>
          <p className="text-xs text-muted-foreground">
            Itens carregados
          </p>
          <div className="flex justify-between text-xs mt-2">
            <span className="text-green-600">{metricas.estoqueBaixado} OK</span>
            <span className="text-blue-600">{metricas.prontosBaixar} Prontos</span>
            <span className="text-red-600">{metricas.comProblema} Problemas</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, AlertTriangle, Clock, CheckCircle, Package, Users } from 'lucide-react';
import { DeParaMetricas } from '@/hooks/useDePara';

interface DeParaMetricasAvancadasProps {
  metricas: DeParaMetricas;
  loading: boolean;
}

interface MetricaExtendida extends DeParaMetricas {
  urgentes?: number;
  alta_prioridade?: number;
  tempo_medio_mapeamento?: number;
  skus_mapeados_hoje?: number;
  pedidos_bloqueados?: number;
  total?: number;
  pendentes?: number;
  preenchidos?: number;
}

export function DeParaMetricasAvancadas({ metricas, loading }: DeParaMetricasAvancadasProps) {
  // Calcular métricas derivadas
  const total = metricas.totalMapeamentos;
  const pendentes = metricas.totalMapeamentos - metricas.mapeamentosAtivos; // Assumindo que ativos = preenchidos
  const preenchidos = metricas.mapeamentosAtivos;
  
  // Simular dados avançados por enquanto - depois vem do backend
  const metricasExtendidas: MetricaExtendida = {
    ...metricas,
    total,
    pendentes,
    preenchidos,
    urgentes: Math.floor(pendentes * 0.2),
    alta_prioridade: Math.floor(pendentes * 0.3),
    tempo_medio_mapeamento: 45, // minutos
    skus_mapeados_hoje: 12,
    pedidos_bloqueados: Math.floor(pendentes * 1.5)
  };

  const taxaPreenchimento = total > 0 
    ? Math.round((preenchidos / total) * 100) 
    : 0;

  const cards = [
    {
      title: 'Total de Mapeamentos',
      value: metricasExtendidas.total,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Todos os SKUs mapeados'
    },
    {
      title: 'SKUs Pendentes',
      value: metricasExtendidas.pendentes,
      icon: AlertTriangle,
      color: metricasExtendidas.pendentes > 10 ? 'text-red-600' : 'text-yellow-600',
      bgColor: metricasExtendidas.pendentes > 10 ? 'bg-red-50' : 'bg-yellow-50',
      description: 'Aguardando mapeamento',
      badge: metricasExtendidas.pendentes > 10 ? 'Crítico' : 'Atenção'
    },
    {
      title: 'SKUs Preenchidos',
      value: metricasExtendidas.preenchidos,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Mapeamento completo'
    },
    {
      title: 'Alta Prioridade',
      value: metricasExtendidas.urgentes + metricasExtendidas.alta_prioridade,
      icon: TrendingUp,
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-50',
      description: 'Requer atenção imediata',
      badge: metricasExtendidas.urgentes > 0 ? 'Urgente' : undefined
    },
    {
      title: 'Pedidos Bloqueados',
      value: metricasExtendidas.pedidos_bloqueados,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Aguardando mapeamento'
    },
    {
      title: 'Tempo Médio',
      value: `${metricasExtendidas.tempo_medio_mapeamento}min`,
      icon: Clock,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      description: 'Para mapear SKUs',
      isTime: true
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card, index) => {
          const IconComponent = card.icon;
          
          return (
            <Card key={index} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  {card.badge && (
                    <Badge 
                      variant={card.badge === 'Crítico' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {card.badge}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <IconComponent className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {card.isTime ? card.value : card.value?.toLocaleString() || '0'}
                    </div>
                    <CardDescription className="text-xs">
                      {card.description}
                    </CardDescription>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

    </div>
  );
}
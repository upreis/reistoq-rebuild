import { TrendingUp, Package, ShoppingCart, AlertTriangle, BarChart3, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardExecutivo } from "@/components/estoque/DashboardExecutivo";
import { DashboardAutomacao } from "@/components/dashboard/DashboardAutomacao";

const metrics = [
  {
    title: "Total de Pedidos",
    value: "1,247",
    change: "+12%",
    icon: ShoppingCart,
    color: "text-primary"
  },
  {
    title: "Produtos em Estoque",
    value: "8,562",
    change: "+3%",
    icon: Package,
    color: "text-secondary"
  },
  {
    title: "Alertas Pendentes",
    value: "23",
    change: "-8%",
    icon: AlertTriangle,
    color: "text-accent"
  },
  {
    title: "Usuários Ativos",
    value: "45",
    change: "+5%",
    icon: Users,
    color: "text-muted-foreground"
  }
];

const recentActivities = [
  {
    id: 1,
    type: "pedido",
    description: "Novo pedido #12847 processado",
    time: "há 2 minutos",
    status: "success"
  },
  {
    id: 2,
    type: "estoque",
    description: "Estoque baixo: Produto SKU-001234",
    time: "há 15 minutos",
    status: "warning"
  },
  {
    id: 3,
    type: "depara",
    description: "Mapeamento CSV importado com sucesso",
    time: "há 1 hora",
    status: "success"
  },
  {
    id: 4,
    type: "sistema",
    description: "Backup automático concluído",
    time: "há 3 horas",
    status: "info"
  }
];

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do sistema de estoque</p>
        </div>
        <Button variant="premium" className="shadow-glow">
          <BarChart3 className="mr-2 h-4 w-4" />
          Relatório Completo
        </Button>
      </div>

      {/* Dashboard Tabs */}
      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="executivo">Dashboard Executivo</TabsTrigger>
          <TabsTrigger value="automacao">Automação</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-6 mt-6">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric, index) => (
              <Card key={index} className="hover:shadow-elegant transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </CardTitle>
                  <metric.icon className={`h-4 w-4 ${metric.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{metric.value}</div>
                  <p className="text-xs text-muted-foreground">
                    <TrendingUp className="inline h-3 w-3 mr-1" />
                    {metric.change} vs. mês anterior
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Activity Feed */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Atividades Recentes</CardTitle>
                  <CardDescription>
                    Últimas operações do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-center space-x-4">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {activity.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activity.time}
                          </p>
                        </div>
                        <Badge 
                          variant={activity.status === 'success' ? 'default' : 
                                  activity.status === 'warning' ? 'destructive' : 'secondary'}
                        >
                          {activity.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Ações Rápidas</CardTitle>
                  <CardDescription>
                    Acesso rápido às funcionalidades
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <Package className="mr-2 h-4 w-4" />
                    Consultar Estoque
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Buscar Pedidos
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Ver Alertas
                  </Button>
                  <Button className="w-full justify-start" variant="secondary">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Gerar Relatório
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="executivo" className="mt-6">
          <DashboardExecutivo />
        </TabsContent>

        <TabsContent value="automacao" className="mt-6">
          <DashboardAutomacao />
        </TabsContent>
      </Tabs>
    </div>
  );
}
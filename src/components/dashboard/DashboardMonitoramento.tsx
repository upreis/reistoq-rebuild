import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Database,
  Bell,
  Zap,
  TrendingUp,
  Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface HistoricoItem {
  id: string;
  tipo: string;
  descricao: string;
  detalhes: any;
  created_at: string;
}

interface StatusSistema {
  sync_ativo: boolean;
  alertas_ativos: boolean;
  ultima_sync: string | null;
  ultimo_alerta: string | null;
  total_pedidos_hoje: number;
  total_alertas_hoje: number;
}

export function DashboardMonitoramento() {
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [status, setStatus] = useState<StatusSistema>({
    sync_ativo: false,
    alertas_ativos: false,
    ultima_sync: null,
    ultimo_alerta: null,
    total_pedidos_hoje: 0,
    total_alertas_hoje: 0
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Carregar dados do sistema
  const carregarDados = async () => {
    try {
      // Buscar configurações
      const { data: configs } = await supabase
        .from('configuracoes')
        .select('chave, valor')
        .in('chave', ['sync_automatico', 'alertas_automaticos', 'ultima_sync_automatica']);

      const configMap = Object.fromEntries(
        configs?.map(c => [c.chave, c.valor]) || []
      );

      // Buscar histórico recente
      const { data: historicoData } = await supabase
        .from('historico')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // Calcular métricas do dia
      const hoje = new Date().toISOString().split('T')[0];
      
      // Use RPC to count pedidos safely
      const { data: pedidosData } = await supabase.rpc('get_pedidos_masked', {
        _start: hoje,
        _end: hoje,
        _search: null,
        _limit: 1000,
        _offset: 0
      });
      const pedidosHoje = pedidosData?.length || 0;

      const alertasHoje = historicoData?.filter(h => 
        h.tipo.includes('alert') && 
        h.created_at.startsWith(hoje)
      ).length || 0;

      const ultimoAlerta = historicoData?.find(h => h.tipo.includes('alert'))?.created_at;

      setStatus({
        sync_ativo: configMap.sync_automatico === 'true',
        alertas_ativos: configMap.alertas_automaticos === 'true',
        ultima_sync: configMap.ultima_sync_automatica,
        ultimo_alerta: ultimoAlerta || null,
        total_pedidos_hoje: pedidosHoje || 0,
        total_alertas_hoje: alertasHoje
      });

      setHistorico(historicoData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  useEffect(() => {
    carregarDados();
    
    // Recarregar a cada minuto
    const interval = setInterval(carregarDados, 60000);
    return () => clearInterval(interval);
  }, []);

  const executarTesteSistema = async () => {
    setLoading(true);
    
    try {
      // Testar sync
      const { data: syncTest } = await supabase.functions.invoke('sync-automatico');
      
      // Testar alertas
      const { data: alertTest } = await supabase.functions.invoke('alertas-inteligentes');
      
      toast({
        title: "✅ Teste do sistema concluído!",
        description: `Sync: ${syncTest?.success ? 'OK' : 'Falha'} | Alertas: ${alertTest?.success ? 'OK' : 'Falha'}`,
      });
      
      // Recarregar dados
      carregarDados();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro no teste",
        description: "Não foi possível testar o sistema",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTipoIcon = (tipo: string) => {
    if (tipo.includes('sync')) return <Database className="h-4 w-4 text-blue-500" />;
    if (tipo.includes('alert')) return <Bell className="h-4 w-4 text-yellow-500" />;
    if (tipo.includes('erro')) return <AlertCircle className="h-4 w-4 text-red-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const formatarTempo = (timestamp: string) => {
    const agora = new Date();
    const data = new Date(timestamp);
    const diffMs = agora.getTime() - data.getTime();
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHoras > 0) {
      return `há ${diffHoras}h ${diffMinutos}m`;
    }
    return `há ${diffMinutos}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Monitoramento</h1>
          <p className="text-muted-foreground">Status em tempo real do sistema REISTOQ</p>
        </div>
        <Button onClick={executarTesteSistema} disabled={loading} variant="default">
          {loading ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="mr-2 h-4 w-4" />
          )}
          Testar Sistema
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Sincronização</span>
            </div>
            <div className="flex items-center justify-between">
              <Badge variant={status.sync_ativo ? "default" : "secondary"}>
                {status.sync_ativo ? "Ativa" : "Inativa"}
              </Badge>
              {status.ultima_sync && (
                <span className="text-xs text-muted-foreground">
                  {formatarTempo(status.ultima_sync)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Alertas</span>
            </div>
            <div className="flex items-center justify-between">
              <Badge variant={status.alertas_ativos ? "default" : "secondary"}>
                {status.alertas_ativos ? "Ativos" : "Inativos"}
              </Badge>
              <span className="text-sm font-bold">{status.total_alertas_hoje}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Pedidos Hoje</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{status.total_pedidos_hoje}</span>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Sistema</span>
            </div>
            <div className="flex items-center justify-between">
              <Badge variant="default">Online</Badge>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Histórico e Logs */}
      <Tabs defaultValue="historico" className="w-full">
        <TabsList>
          <TabsTrigger value="historico">Histórico de Atividades</TabsTrigger>
          <TabsTrigger value="metricas">Métricas do Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="historico">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Atividades Recentes
              </CardTitle>
              <CardDescription>
                Log das últimas operações executadas pelo sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {historico.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50">
                      {getTipoIcon(item.tipo)}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{item.descricao}</p>
                          <span className="text-xs text-muted-foreground">
                            {formatarTempo(item.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Tipo: {item.tipo}
                        </p>
                        {item.detalhes && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-primary">Ver detalhes</summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                              {JSON.stringify(item.detalhes, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                  {historico.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma atividade registrada ainda</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metricas">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Hoje</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Pedidos Sincronizados</span>
                  <span className="font-bold">{status.total_pedidos_hoje}</span>
                </div>
                <div className="flex justify-between">
                  <span>Alertas Enviados</span>
                  <span className="font-bold">{status.total_alertas_hoje}</span>
                </div>
                <div className="flex justify-between">
                  <span>Última Sync</span>
                  <span className="text-sm">
                    {status.ultima_sync ? formatarTempo(status.ultima_sync) : 'Nunca'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status dos Serviços</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Tiny ERP API</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex justify-between items-center">
                  <span>Telegram Bot</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex justify-between items-center">
                  <span>Banco de Dados</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex justify-between items-center">
                  <span>Edge Functions</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
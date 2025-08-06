import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Zap, 
  Clock, 
  Play, 
  Pause, 
  RefreshCw, 
  Bell, 
  MapPin, 
  Activity,
  CheckCircle,
  AlertCircle,
  Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ConfigAutomacao {
  sync_automatico: boolean;
  sync_intervalo: string;
  auto_mapear_sku: boolean;
  alertas_estoque_baixo: boolean;
  alertas_skus_pendentes: boolean;
  alertas_pedidos_parados: boolean;
  alertas_sync_falhas: boolean;
  ultima_sync_automatica?: string;
}

export function DashboardAutomacao() {
  const [config, setConfig] = useState<ConfigAutomacao>({
    sync_automatico: false,
    sync_intervalo: '30',
    auto_mapear_sku: false,
    alertas_estoque_baixo: false,
    alertas_skus_pendentes: false,
    alertas_pedidos_parados: false,
    alertas_sync_falhas: false
  });
  const [loading, setLoading] = useState(false);
  const [statusSync, setStatusSync] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [proximaSync, setProximaSync] = useState<string>('');
  const { toast } = useToast();

  // Carregar configurações
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data } = await supabase
          .from('configuracoes')
          .select('chave, valor')
          .in('chave', [
            'sync_automatico',
            'sync_intervalo', 
            'auto_mapear_sku',
            'alertas_estoque_baixo',
            'alertas_skus_pendentes',
            'alertas_pedidos_parados',
            'alertas_sync_falhas',
            'ultima_sync_automatica'
          ]);

        if (data) {
          const configMap = Object.fromEntries(
            data.map(item => [item.chave, item.valor])
          );

          setConfig({
            sync_automatico: configMap.sync_automatico === 'true',
            sync_intervalo: configMap.sync_intervalo || '30',
            auto_mapear_sku: configMap.auto_mapear_sku === 'true',
            alertas_estoque_baixo: configMap.alertas_estoque_baixo === 'true',
            alertas_skus_pendentes: configMap.alertas_skus_pendentes === 'true',
            alertas_pedidos_parados: configMap.alertas_pedidos_parados === 'true',
            alertas_sync_falhas: configMap.alertas_sync_falhas === 'true',
            ultima_sync_automatica: configMap.ultima_sync_automatica
          });

          // Calcular próxima sincronização
          if (configMap.ultima_sync_automatica && configMap.sync_automatico === 'true') {
            const ultimaSync = new Date(configMap.ultima_sync_automatica);
            const intervalo = parseInt(configMap.sync_intervalo || '30');
            const proxima = new Date(ultimaSync.getTime() + intervalo * 60 * 1000);
            setProximaSync(proxima.toLocaleString('pt-BR'));
          }
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    };

    loadConfig();
    
    // Recarregar a cada minuto para atualizar próxima sync
    const interval = setInterval(loadConfig, 60000);
    return () => clearInterval(interval);
  }, []);

  const salvarConfig = async (chave: string, valor: string) => {
    try {
      await supabase
        .from('configuracoes')
        .upsert(
          { chave, valor, tipo: typeof valor === 'boolean' ? 'boolean' : 'string' },
          { onConflict: 'chave' }
        );
      
      toast({
        title: "Configuração salva",
        description: "As alterações foram aplicadas com sucesso.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar a configuração.",
      });
    }
  };

  const executarSyncManual = async () => {
    setLoading(true);
    setStatusSync('running');
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-automatico');
      
      if (error) throw error;
      
      if (data.success) {
        setStatusSync('success');
        toast({
          title: "✅ Sincronização concluída!",
          description: data.message,
        });
      } else {
        setStatusSync('error');
        toast({
          variant: "destructive",
          title: "Falha na sincronização",
          description: data.error,
        });
      }
    } catch (error) {
      setStatusSync('error');
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível executar a sincronização",
      });
    } finally {
      setLoading(false);
      setTimeout(() => setStatusSync('idle'), 3000);
    }
  };

  const testarAlertas = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('alertas-inteligentes');
      
      if (error) throw error;
      
      toast({
        title: "🔔 Alertas testados!",
        description: `${data.alertas_enviados} alertas foram enviados`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível testar os alertas",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (statusSync) {
      case 'running': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Automação</h1>
          <p className="text-muted-foreground">Controle inteligente do sistema REISTOQ</p>
        </div>
        <Badge variant={config.sync_automatico ? "default" : "secondary"} className="text-sm">
          {config.sync_automatico ? (
            <>
              <Zap className="mr-1 h-3 w-3" />
              Automação Ativa
            </>
          ) : (
            <>
              <Pause className="mr-1 h-3 w-3" />
              Automação Pausada
            </>
          )}
        </Badge>
      </div>

      {/* Status da Sincronização */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Status da Sincronização
          </CardTitle>
          <CardDescription>
            Controle e monitoramento da sincronização automática
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Sincronização Automática</p>
              <p className="text-xs text-muted-foreground">
                {config.sync_automatico 
                  ? `Executando a cada ${config.sync_intervalo} minutos`
                  : 'Desativada - execute manualmente quando necessário'
                }
              </p>
            </div>
            <Switch
              checked={config.sync_automatico}
              onCheckedChange={(checked) => {
                setConfig(prev => ({ ...prev, sync_automatico: checked }));
                salvarConfig('sync_automatico', checked.toString());
              }}
            />
          </div>

          {config.sync_automatico && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium">Intervalo de Sincronização</p>
                  <p className="text-xs text-muted-foreground">Frequência das verificações automáticas</p>
                </div>
                <Select
                  value={config.sync_intervalo}
                  onValueChange={(value) => {
                    setConfig(prev => ({ ...prev, sync_intervalo: value }));
                    salvarConfig('sync_intervalo', value);
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 min</SelectItem>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                    <SelectItem value="240">4 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {proximaSync && (
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Próxima sincronização: {proximaSync}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={executarSyncManual}
              disabled={loading}
              variant="default"
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Executar Agora
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Mapeamento de SKU */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Auto-Mapeamento de SKU
          </CardTitle>
          <CardDescription>
            Criação automática de mapeamentos pendentes para novos SKUs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Auto-Mapeamento Ativo</p>
              <p className="text-xs text-muted-foreground">
                {config.auto_mapear_sku 
                  ? 'Novos SKUs são automaticamente adicionados como pendentes'
                  : 'SKUs precisam ser mapeados manualmente'
                }
              </p>
            </div>
            <Switch
              checked={config.auto_mapear_sku}
              onCheckedChange={(checked) => {
                setConfig(prev => ({ ...prev, auto_mapear_sku: checked }));
                salvarConfig('auto_mapear_sku', checked.toString());
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sistema de Alertas Inteligentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertas Inteligentes
          </CardTitle>
          <CardDescription>
            Monitoramento proativo com notificações no Telegram
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Estoque Baixo</p>
                <p className="text-xs text-muted-foreground">Produtos com estoque zero ou abaixo do mínimo</p>
              </div>
              <Switch
                checked={config.alertas_estoque_baixo}
                onCheckedChange={(checked) => {
                  setConfig(prev => ({ ...prev, alertas_estoque_baixo: checked }));
                  salvarConfig('alertas_estoque_baixo', checked.toString());
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">SKUs Pendentes</p>
                <p className="text-xs text-muted-foreground">SKUs sem mapeamento com pedidos aguardando</p>
              </div>
              <Switch
                checked={config.alertas_skus_pendentes}
                onCheckedChange={(checked) => {
                  setConfig(prev => ({ ...prev, alertas_skus_pendentes: checked }));
                  salvarConfig('alertas_skus_pendentes', checked.toString());
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Pedidos Parados</p>
                <p className="text-xs text-muted-foreground">Pedidos há mais de 7 dias sem movimentação</p>
              </div>
              <Switch
                checked={config.alertas_pedidos_parados}
                onCheckedChange={(checked) => {
                  setConfig(prev => ({ ...prev, alertas_pedidos_parados: checked }));
                  salvarConfig('alertas_pedidos_parados', checked.toString());
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Falhas de Sincronização</p>
                <p className="text-xs text-muted-foreground">Erros na sincronização automática</p>
              </div>
              <Switch
                checked={config.alertas_sync_falhas}
                onCheckedChange={(checked) => {
                  setConfig(prev => ({ ...prev, alertas_sync_falhas: checked }));
                  salvarConfig('alertas_sync_falhas', checked.toString());
                }}
              />
            </div>
          </div>

          <Separator />

          <Button
            onClick={testarAlertas}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <Bell className="mr-2 h-4 w-4" />
                Testar Alertas
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
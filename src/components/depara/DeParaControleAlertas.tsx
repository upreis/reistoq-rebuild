import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Bell, Settings, ChevronDown, Clock } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function DeParaControleAlertas() {
  const [alertasAutomaticos, setAlertasAutomaticos] = useState(false);
  const [intervaloAlertas, setIntervaloAlertas] = useState('60');
  const [configAberta, setConfigAberta] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  const carregarConfiguracoes = async () => {
    try {
      setLoading(true);
      
      const chaves = ['alertas_automaticos_depara', 'intervalo_alertas_depara'];

      const { data, error } = await supabase
        .from('configuracoes')
        .select('chave, valor')
        .in('chave', chaves);

      if (error) throw error;

      const configMap = data?.reduce((acc, item) => {
        acc[item.chave] = item.valor;
        return acc;
      }, {} as Record<string, string>) || {};

      setAlertasAutomaticos(configMap['alertas_automaticos_depara'] === 'true');
      setIntervaloAlertas(configMap['intervalo_alertas_depara'] || '60');
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const salvarConfiguracao = async (chave: string, valor: string) => {
    try {
      const { data: orgId } = await supabase.rpc('get_current_org_id');
      if (!orgId) throw new Error('Organização não encontrada');
      const { error } = await supabase
        .from('configuracoes')
        .upsert({ organization_id: orgId, chave: `${chave}_depara`, valor, tipo: 'string', descricao: `Configuração de alertas DePara: ${chave}` }, { onConflict: 'organization_id,chave' });

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      throw error;
    }
  };

  const handleAlertasChange = async (ativado: boolean) => {
    try {
      setLoading(true);
      setAlertasAutomaticos(ativado);
      await salvarConfiguracao('alertas_automaticos', ativado.toString());
      
      toast({
        title: ativado ? 'Alertas Ativados' : 'Alertas Desativados',
        description: ativado 
          ? 'Você receberá alertas de SKUs pendentes'
          : 'Alertas de SKUs pendentes desativados',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configuração de alertas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIntervaloChange = async (novoIntervalo: string) => {
    try {
      setLoading(true);
      setIntervaloAlertas(novoIntervalo);
      await salvarConfiguracao('intervalo_alertas', novoIntervalo);
      
      const descricaoIntervalo = novoIntervalo === '0' 
        ? 'tempo real' 
        : `${novoIntervalo} minutos`;
      
      toast({
        title: 'Intervalo Atualizado',
        description: `Alertas configurados para ${descricaoIntervalo}`,
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar intervalo de alertas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const intervalos = [
    { value: '0', label: 'Tempo Real' },
    { value: '15', label: '15 minutos' },
    { value: '30', label: '30 minutos' },
    { value: '60', label: '1 hora' },
    { value: '120', label: '2 horas' },
    { value: '240', label: '4 horas' },
    { value: '480', label: '8 horas' },
    { value: '1440', label: '24 horas' }
  ];

  return (
    <Collapsible open={configAberta} onOpenChange={setConfigAberta}>
      <div className="bg-card border rounded-lg">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors rounded-lg">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Alertas</span>
              <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${configAberta ? 'rotate-180' : ''}`} />
            </div>
            <div className="flex items-center gap-2">
              {!alertasAutomaticos && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  Desativado
                </Badge>
              )}
              {alertasAutomaticos && (
                <Badge variant="default" className="text-xs px-2 py-0.5">
                  {intervaloAlertas === '0' ? 'Tempo Real' : 'Programado'}
                </Badge>
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 space-y-3">
            {/* Alertas Automáticos */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="alerts-auto" className="text-sm font-medium">
                  Alertas Automáticos
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receber notificações de SKUs pendentes no Telegram
                </p>
              </div>
              <Switch
                id="alerts-auto"
                checked={alertasAutomaticos}
                onCheckedChange={handleAlertasChange}
                disabled={loading}
              />
            </div>

            {alertasAutomaticos && (
              <div className="space-y-3 pl-4 border-l-2 border-muted">
                <div className="flex items-center gap-3">
                  <Label className="text-sm min-w-[60px]">Intervalo:</Label>
                  <Select value={intervaloAlertas} onValueChange={handleIntervaloChange}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {intervalos.map((intervalo) => (
                        <SelectItem key={intervalo.value} value={intervalo.value}>
                          <div className="flex items-center gap-2">
                            {intervalo.value === '0' && <Clock className="h-3 w-3" />}
                            {intervalo.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-xs text-muted-foreground">
                  {intervaloAlertas === '0' 
                    ? '💡 Alertas enviados imediatamente quando SKUs pendentes são criados'
                    : `📅 Alertas enviados a cada ${intervalos.find(i => i.value === intervaloAlertas)?.label}`
                  }
                </div>

                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  ℹ️ Configurações do Telegram são compartilhadas com a página de Configurações
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
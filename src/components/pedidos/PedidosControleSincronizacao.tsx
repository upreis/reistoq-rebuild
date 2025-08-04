import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Clock, Zap, Settings, ChevronDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PedidosControleSincronizacaoProps {
  onSincronizar: () => void;
  loading: boolean;
  ultimaSincronizacao?: string;
}

export function PedidosControleSincronizacao({ 
  onSincronizar, 
  loading, 
  ultimaSincronizacao 
}: PedidosControleSincronizacaoProps) {
  const [sincronizacaoAutomatica, setSincronizacaoAutomatica] = useState(false);
  const [intervaloSincronizacao, setIntervaloSincronizacao] = useState('5'); // minutos
  const [proximaSincronizacao, setProximaSincronizacao] = useState<Date | null>(null);
  const [tempoRestante, setTempoRestante] = useState<string>('');
  const [configAberta, setConfigAberta] = useState(false);

  // Carregar configurações salvas
  useEffect(() => {
    const configSalva = localStorage.getItem('pedidos-sincronizacao-config');
    if (configSalva) {
      try {
        const config = JSON.parse(configSalva);
        setSincronizacaoAutomatica(config.automatica || false);
        setIntervaloSincronizacao(config.intervalo || '5');
      } catch (error) {
        console.warn('Erro ao carregar configuração de sincronização:', error);
      }
    }
  }, []);

  // Salvar configurações
  useEffect(() => {
    const config = {
      automatica: sincronizacaoAutomatica,
      intervalo: intervaloSincronizacao
    };
    localStorage.setItem('pedidos-sincronizacao-config', JSON.stringify(config));
  }, [sincronizacaoAutomatica, intervaloSincronizacao]);

  // Controle de sincronização automática
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (sincronizacaoAutomatica) {
      const intervalMs = parseInt(intervaloSincronizacao) * 60 * 1000; // converter para milissegundos
      
      // Definir próxima sincronização
      const proxima = new Date(Date.now() + intervalMs);
      setProximaSincronizacao(proxima);

      intervalId = setInterval(() => {
        console.log('Sincronização automática executada');
        onSincronizar();
        
        // Atualizar próxima sincronização
        const novaProxima = new Date(Date.now() + intervalMs);
        setProximaSincronizacao(novaProxima);
        
        toast({
          title: "Sincronização Automática",
          description: "Dados atualizados automaticamente",
        });
      }, intervalMs);

      toast({
        title: "Sincronização Automática Ativada",
        description: `Dados serão atualizados a cada ${intervaloSincronizacao} minutos`,
      });
    } else {
      setProximaSincronizacao(null);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [sincronizacaoAutomatica, intervaloSincronizacao, onSincronizar]);

  // Contador regressivo
  useEffect(() => {
    let countdownId: NodeJS.Timeout | null = null;

    if (sincronizacaoAutomatica && proximaSincronizacao) {
      countdownId = setInterval(() => {
        const agora = new Date();
        const diferenca = proximaSincronizacao.getTime() - agora.getTime();

        if (diferenca > 0) {
          const minutos = Math.floor(diferenca / (1000 * 60));
          const segundos = Math.floor((diferenca % (1000 * 60)) / 1000);
          setTempoRestante(`${minutos}m ${segundos}s`);
        } else {
          setTempoRestante('');
        }
      }, 1000);
    } else {
      setTempoRestante('');
    }

    return () => {
      if (countdownId) {
        clearInterval(countdownId);
      }
    };
  }, [sincronizacaoAutomatica, proximaSincronizacao]);


  const intervalos = [
    { value: '1', label: '1 minuto' },
    { value: '5', label: '5 minutos' },
    { value: '10', label: '10 minutos' },
    { value: '15', label: '15 minutos' },
    { value: '30', label: '30 minutos' },
    { value: '60', label: '1 hora' }
  ];

  const formatarUltimaSincronizacao = () => {
    if (!ultimaSincronizacao) return 'Nunca';
    
    const data = new Date(ultimaSincronizacao);
    const agora = new Date();
    const diferenca = agora.getTime() - data.getTime();
    const minutos = Math.floor(diferenca / (1000 * 60));
    
    if (minutos < 1) return 'Agora mesmo';
    if (minutos === 1) return 'Há 1 minuto';
    if (minutos < 60) return `Há ${minutos} minutos`;
    
    const horas = Math.floor(minutos / 60);
    if (horas === 1) return 'Há 1 hora';
    if (horas < 24) return `Há ${horas} horas`;
    
    return data.toLocaleDateString();
  };

  return (
    <Collapsible open={configAberta} onOpenChange={setConfigAberta}>
      <div className="bg-card border rounded-lg">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors rounded-lg">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Sincronização</span>
              <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${configAberta ? 'rotate-180' : ''}`} />
            </div>
            <div className="flex items-center gap-2">
              {!sincronizacaoAutomatica && (
                <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 text-xs px-2 py-0.5">
                  Manual
                </Badge>
              )}
              {sincronizacaoAutomatica && (
                <Badge variant="default" className="text-xs px-2 py-0.5">
                  Automático
                </Badge>
              )}
              <span className={`text-xs ${loading ? 'text-yellow-600' : 'text-green-600'}`}>
                {loading ? 'Sincronizando...' : 'Pronto'}
              </span>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 space-y-3">
            {/* Sincronização Automática */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="sync-auto" className="text-sm font-medium">
                  Sincronização Automática
                </Label>
                <p className="text-xs text-muted-foreground">
                  Atualizar dados automaticamente em intervalos regulares
                </p>
              </div>
              <Switch
                id="sync-auto"
                checked={sincronizacaoAutomatica}
                onCheckedChange={setSincronizacaoAutomatica}
              />
            </div>

            {sincronizacaoAutomatica && (
              <div className="space-y-3 pl-4 border-l-2 border-muted">
                <div className="flex items-center gap-3">
                  <Label className="text-sm min-w-[60px]">Intervalo:</Label>
                  <Select value={intervaloSincronizacao} onValueChange={setIntervaloSincronizacao}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {intervalos.map((intervalo) => (
                        <SelectItem key={intervalo.value} value={intervalo.value}>
                          {intervalo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {tempoRestante && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Próxima sincronização em: 
                    <Badge variant="outline" className="font-mono">
                      {tempoRestante}
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
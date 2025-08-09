import { Settings, Key, Bell, Database, Zap, ExternalLink, HelpCircle, MessageSquare, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { IntegrationAccountsManager } from "@/components/integrations/IntegrationAccountsManager";
import { RolePermissionManager } from "@/components/auth/RolePermissionManager";
import { AnnouncementsManager } from "@/components/notifications/AnnouncementsManager";
import type { TickerItem, UrgencyLevel } from "@/components/notifications/AnnouncementTicker";

export function Configuracoes() {
  const [tinyToken, setTinyToken] = useState("");
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [alertasAutomaticos, setAlertasAutomaticos] = useState(false);
  const [intervaloAlertas, setIntervaloAlertas] = useState("60");
  
  // Novas configurações de automação - Fase 2
  const [syncAutomatico, setSyncAutomatico] = useState(false);
  const [syncIntervalo, setSyncIntervalo] = useState("30");
  const [autoMapearSku, setAutoMapearSku] = useState(false);
  const [alertasEstoqueBaixo, setAlertasEstoqueBaixo] = useState(false);
  const [alertasSkusPendentes, setAlertasSkusPendentes] = useState(false);
  const [alertasPedidosParados, setAlertasPedidosParados] = useState(false);
  const [alertasSyncFalhas, setAlertasSyncFalhas] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Announcement Ticker configs
const [urgencyMap, setUrgencyMap] = useState<Partial<Record<UrgencyLevel, "muted" | "success" | "warning" | "primary" | "destructive" | "card">>>({});
  const [customItems, setCustomItems] = useState<TickerItem[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newHref, setNewHref] = useState("");
  const [newUrgency, setNewUrgency] = useState<UrgencyLevel>("medium");

  // Carregar configurações existentes
  useEffect(() => {
    const loadConfiguracoes = async () => {
      try {
        const { data, error } = await supabase
          .from('configuracoes')
          .select('chave, valor')
          .in('chave', [
            'tiny_token', 
            'telegram_token', 
            'telegram_chat_id', 
            'alertas_automaticos', 
            'intervalo_alertas',
            'sync_automatico',
            'sync_intervalo',
            'auto_mapear_sku',
            'alertas_estoque_baixo',
            'alertas_skus_pendentes',
            'alertas_pedidos_parados',
            'alertas_sync_falhas',
            'ticker_urgency_map',
            'ticker_custom_items'
          ]);

        if (error) throw error;

        data?.forEach((config) => {
          switch (config.chave) {
            case 'tiny_token':
              setTinyToken(config.valor);
              break;
            case 'telegram_token':
              setTelegramToken(config.valor);
              break;
            case 'telegram_chat_id':
              setTelegramChatId(config.valor);
              break;
            case 'alertas_automaticos':
              setAlertasAutomaticos(config.valor === 'true');
              break;
            case 'intervalo_alertas':
              setIntervaloAlertas(config.valor);
              break;
            case 'sync_automatico':
              setSyncAutomatico(config.valor === 'true');
              break;
            case 'sync_intervalo':
              setSyncIntervalo(config.valor);
              break;
            case 'auto_mapear_sku':
              setAutoMapearSku(config.valor === 'true');
              break;
            case 'alertas_estoque_baixo':
              setAlertasEstoqueBaixo(config.valor === 'true');
              break;
            case 'alertas_skus_pendentes':
              setAlertasSkusPendentes(config.valor === 'true');
              break;
            case 'alertas_pedidos_parados':
              setAlertasPedidosParados(config.valor === 'true');
              break;
            case 'alertas_sync_falhas':
              setAlertasSyncFalhas(config.valor === 'true');
              break;
            case 'ticker_urgency_map':
              try { setUrgencyMap(JSON.parse(config.valor)); } catch {}
              break;
            case 'ticker_custom_items':
              try { setCustomItems(JSON.parse(config.valor)); } catch {}
              break;
          }
        });
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    };

    loadConfiguracoes();
  }, []);

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      // Salvar configurações no Supabase usando upsert com onConflict
      const updates = [];
      
      if (tinyToken) {
        updates.push(
          supabase
            .from('configuracoes')
            .upsert(
              { chave: 'tiny_token', valor: tinyToken, tipo: 'string' },
              { onConflict: 'chave' }
            )
        );
      }
      
      if (telegramToken) {
        updates.push(
          supabase
            .from('configuracoes')
            .upsert(
              { chave: 'telegram_token', valor: telegramToken, tipo: 'string' },
              { onConflict: 'chave' }
            )
        );
      }
      
      if (telegramChatId) {
        updates.push(
          supabase
            .from('configuracoes')
            .upsert(
              { chave: 'telegram_chat_id', valor: telegramChatId, tipo: 'string' },
              { onConflict: 'chave' }
            )
        );
      }

      // Salvar configurações de alertas automáticos
      updates.push(
        supabase
          .from('configuracoes')
          .upsert(
            { chave: 'alertas_automaticos', valor: alertasAutomaticos.toString(), tipo: 'boolean' },
            { onConflict: 'chave' }
          )
      );

      updates.push(
        supabase
          .from('configuracoes')
          .upsert(
            { chave: 'intervalo_alertas', valor: intervaloAlertas, tipo: 'number' },
            { onConflict: 'chave' }
          )
      );

      // Salvar configurações de automação - Fase 2
      updates.push(
        supabase
          .from('configuracoes')
          .upsert(
            { chave: 'sync_automatico', valor: syncAutomatico.toString(), tipo: 'boolean' },
            { onConflict: 'chave' }
          )
      );

      updates.push(
        supabase
          .from('configuracoes')
          .upsert(
            { chave: 'sync_intervalo', valor: syncIntervalo, tipo: 'number' },
            { onConflict: 'chave' }
          )
      );

      updates.push(
        supabase
          .from('configuracoes')
          .upsert(
            { chave: 'auto_mapear_sku', valor: autoMapearSku.toString(), tipo: 'boolean' },
            { onConflict: 'chave' }
          )
      );

      updates.push(
        supabase
          .from('configuracoes')
          .upsert(
            { chave: 'alertas_estoque_baixo', valor: alertasEstoqueBaixo.toString(), tipo: 'boolean' },
            { onConflict: 'chave' }
          )
      );

      updates.push(
        supabase
          .from('configuracoes')
          .upsert(
            { chave: 'alertas_skus_pendentes', valor: alertasSkusPendentes.toString(), tipo: 'boolean' },
            { onConflict: 'chave' }
          )
      );

      updates.push(
        supabase
          .from('configuracoes')
          .upsert(
            { chave: 'alertas_pedidos_parados', valor: alertasPedidosParados.toString(), tipo: 'boolean' },
            { onConflict: 'chave' }
          )
      );

      updates.push(
        supabase
          .from('configuracoes')
          .upsert(
            { chave: 'alertas_sync_falhas', valor: alertasSyncFalhas.toString(), tipo: 'boolean' },
            { onConflict: 'chave' }
          )
      );

      const results = await Promise.all(updates);
      
      // Verificar se todas as operações foram bem-sucedidas
      const hasError = results.some(result => result.error);
      if (hasError) {
        throw new Error('Erro ao salvar algumas configurações');
      }
      
      // Gerenciar cron job após salvar as configurações
      if (alertasAutomaticos && parseInt(intervaloAlertas) > 0) {
        try {
          const { error: cronError } = await supabase.functions.invoke('gerenciar-cron-alertas', {
            body: {
              ativar: alertasAutomaticos,
              intervalo_minutos: parseInt(intervaloAlertas)
            }
          });

          if (cronError) {
            console.error('Erro ao configurar cron job:', cronError);
          }
        } catch (cronError) {
          console.error('Erro ao chamar função de cron:', cronError);
        }
      }
      
      toast({
        title: "Configurações salvas",
        description: "As configurações foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar as configurações. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncPedidos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-pedidos-tiny-basico');
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Erro na sincronização",
          description: error.message,
        });
        return;
      }

      if (data.success) {
        toast({
          title: "✅ Sincronização concluída!",
          description: data.message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Falha na sincronização",
          description: data.error,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível sincronizar pedidos",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTickerConfig = async () => {
    try {
      const payloadMap = JSON.stringify(urgencyMap || {});
      const payloadItems = JSON.stringify(customItems || []);
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase.from('configuracoes').upsert({ chave: 'ticker_urgency_map', valor: payloadMap, tipo: 'json' }, { onConflict: 'chave' }),
        supabase.from('configuracoes').upsert({ chave: 'ticker_custom_items', valor: payloadItems, tipo: 'json' }, { onConflict: 'chave' }),
      ]);
      if (e1 || e2) throw e1 || e2;
      toast({ title: 'Ticker atualizado', description: 'Preferências e alertas salvos com sucesso.' });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao salvar o ticker.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">APIs, notificações e preferências do sistema</p>
        </div>
      </div>

      {/* Status Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Status das Integrações
          </CardTitle>
          <CardDescription>
            Status em tempo real das conexões e funcionalidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Tiny ERP</p>
                <Badge variant={tinyToken ? "default" : "secondary"}>
                  {tinyToken ? "Configurado" : "Pendente"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {tinyToken ? "API conectada e pronta" : "Token não configurado"}
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Telegram Bot</p>
                <Badge variant={telegramToken && telegramChatId ? "default" : "secondary"}>
                  {telegramToken && telegramChatId ? "Configurado" : "Pendente"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {telegramToken && telegramChatId ? "Bot ativo e conectado" : "Bot ou Chat ID não configurado"}
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Alertas Automáticos</p>
                <Badge variant={alertasAutomaticos ? "default" : "secondary"}>
                  {alertasAutomaticos ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {alertasAutomaticos 
                  ? `Verificando a cada ${intervaloAlertas === "0" ? "tempo real" : `${intervaloAlertas}min`}`
                  : "Sistema de alertas desativado"
                }
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              disabled={!tinyToken || loading}
              onClick={handleSyncPedidos}
            >
              {loading ? "Sincronizando..." : "🔄 Sincronizar Pedidos"}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              disabled={!telegramToken || !telegramChatId || loading}
              onClick={async () => {
                setLoading(true);
                try {
                  const { data, error } = await supabase.functions.invoke('testar-telegram-bot');
                  if (data?.success) {
                    toast({
                      title: "✅ Telegram funcionando!",
                      description: "Mensagem de teste enviada",
                    });
                  }
                } catch (error) {
                  toast({
                    variant: "destructive",
                    title: "Erro",
                    description: "Falha no teste do Telegram",
                  });
                } finally {
                  setLoading(false);
                }
              }}
            >
              {loading ? "Testando..." : "📱 Testar Telegram"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Integrações · Contas */}
      <IntegrationAccountsManager />

      {/* Cargos e Permissões */}
      <RolePermissionManager />

      {/* Avisos e Anúncios */}
      <AnnouncementsManager />

      {/* Announcement Ticker - Preferências e Alertas Manuais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Announcement Ticker
          </CardTitle>
          <CardDescription>Defina cores por urgência e adicione alertas manuais exibidos no topo do sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cores por urgência */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Baixa (low)</Label>
              <Select value={urgencyMap.low as any || 'success'} onValueChange={(v) => setUrgencyMap((p) => ({ ...p, low: v as any }))}>
                <SelectTrigger><SelectValue placeholder="Escolha a cor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="success">Verde (Sucesso)</SelectItem>
                  <SelectItem value="warning">Laranja (Aviso)</SelectItem>
                  <SelectItem value="destructive">Vermelho (Crítico)</SelectItem>
                  <SelectItem value="primary">Primário</SelectItem>
                  <SelectItem value="muted">Neutro</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setUrgencyMap((p) => ({ ...p, low: 'success' }))} className="rounded-full px-2 py-1 text-xs bg-success text-success-foreground">Verde</button>
                <button type="button" onClick={() => setUrgencyMap((p) => ({ ...p, low: 'warning' }))} className="rounded-full px-2 py-1 text-xs bg-warning text-warning-foreground">Amarelo</button>
                <button type="button" onClick={() => setUrgencyMap((p) => ({ ...p, low: 'destructive' }))} className="rounded-full px-2 py-1 text-xs bg-destructive text-destructive-foreground">Vermelho</button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Média (medium)</Label>
              <Select value={urgencyMap.medium as any || 'warning'} onValueChange={(v) => setUrgencyMap((p) => ({ ...p, medium: v as any }))}>
                <SelectTrigger><SelectValue placeholder="Escolha a cor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="muted">Neutro</SelectItem>
                  <SelectItem value="warning">Aviso</SelectItem>
                  <SelectItem value="primary">Primário</SelectItem>
                  <SelectItem value="destructive">Crítico</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setUrgencyMap((p) => ({ ...p, medium: 'success' }))} className="rounded-full px-2 py-1 text-xs bg-success text-success-foreground">Verde</button>
                <button type="button" onClick={() => setUrgencyMap((p) => ({ ...p, medium: 'warning' }))} className="rounded-full px-2 py-1 text-xs bg-warning text-warning-foreground">Amarelo</button>
                <button type="button" onClick={() => setUrgencyMap((p) => ({ ...p, medium: 'destructive' }))} className="rounded-full px-2 py-1 text-xs bg-destructive text-destructive-foreground">Vermelho</button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Alta (high)</Label>
              <Select value={urgencyMap.high as any || 'primary'} onValueChange={(v) => setUrgencyMap((p) => ({ ...p, high: v as any }))}>
                <SelectTrigger><SelectValue placeholder="Escolha a cor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="muted">Neutro</SelectItem>
                  <SelectItem value="warning">Aviso</SelectItem>
                  <SelectItem value="primary">Primário</SelectItem>
                  <SelectItem value="destructive">Crítico</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setUrgencyMap((p) => ({ ...p, high: 'success' }))} className="rounded-full px-2 py-1 text-xs bg-success text-success-foreground">Verde</button>
                <button type="button" onClick={() => setUrgencyMap((p) => ({ ...p, high: 'warning' }))} className="rounded-full px-2 py-1 text-xs bg-warning text-warning-foreground">Amarelo</button>
                <button type="button" onClick={() => setUrgencyMap((p) => ({ ...p, high: 'destructive' }))} className="rounded-full px-2 py-1 text-xs bg-destructive text-destructive-foreground">Vermelho</button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Crítica (critical)</Label>
              <Select value={urgencyMap.critical as any || 'destructive'} onValueChange={(v) => setUrgencyMap((p) => ({ ...p, critical: v as any }))}>
                <SelectTrigger><SelectValue placeholder="Escolha a cor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="muted">Neutro</SelectItem>
                  <SelectItem value="warning">Aviso</SelectItem>
                  <SelectItem value="primary">Primário</SelectItem>
                  <SelectItem value="destructive">Crítico</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setUrgencyMap((p) => ({ ...p, critical: 'success' }))} className="rounded-full px-2 py-1 text-xs bg-success text-success-foreground">Verde</button>
                <button type="button" onClick={() => setUrgencyMap((p) => ({ ...p, critical: 'warning' }))} className="rounded-full px-2 py-1 text-xs bg-warning text-warning-foreground">Amarelo</button>
                <button type="button" onClick={() => setUrgencyMap((p) => ({ ...p, critical: 'destructive' }))} className="rounded-full px-2 py-1 text-xs bg-destructive text-destructive-foreground">Vermelho</button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Adicionar alerta manual */}
          <div className="grid md:grid-cols-4 gap-3 items-end">
            <div className="grid gap-2">
              <Label>Título</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex.: Sem mapeamento" />
            </div>
            <div className="grid gap-2">
              <Label>Descrição (opcional)</Label>
              <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Detalhes rápidos" />
            </div>
            <div className="grid gap-2">
              <Label>Link (opcional)</Label>
              <Input value={newHref} onChange={(e) => setNewHref(e.target.value)} placeholder="https://..." />
            </div>
            <div className="grid gap-2">
              <Label>Urgência</Label>
              <Select value={newUrgency} onValueChange={(v: UrgencyLevel) => setNewUrgency(v)}>
                <SelectTrigger><SelectValue placeholder="Urgência" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Button
              size="sm"
              onClick={() => {
                if (!newTitle.trim()) return;
                const id = Date.now().toString(36);
                const item: TickerItem = { id, title: newTitle.trim(), description: newDescription || undefined, href: newHref || undefined, urgency: newUrgency };
                setCustomItems((prev) => [...prev, item]);
                setNewTitle(""); setNewDescription(""); setNewHref(""); setNewUrgency("medium");
              }}
            >Adicionar alerta</Button>
          </div>

          {/* Lista de alertas manuais */}
          <div className="space-y-2">
            {customItems.map((it) => (
              <div key={it.id} className="flex items-center justify-between border rounded-md p-2">
                <div className="text-sm">
                  <span className="font-medium mr-2">[{it.urgency}]</span>{it.title}
                  {it.description && <span className="text-muted-foreground ml-2">— {it.description}</span>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => setCustomItems((prev) => prev.filter((x) => x.id !== it.id))} aria-label="Remover">
                  ✕
                </Button>
              </div>
            ))}
            {!customItems.length && (
              <div className="text-sm text-muted-foreground">Nenhum alerta manual adicionado.</div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveTickerConfig}>Salvar preferências do Ticker</Button>
          </div>
        </CardContent>
      </Card>




      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Configurações de API
          </CardTitle>
          <CardDescription>
            Configure as integrações externas do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tiny ERP */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-foreground">Tiny ERP</h3>
                <p className="text-sm text-muted-foreground">Integração para pedidos e clientes</p>
              </div>
              <Badge variant={tinyToken ? "default" : "secondary"}>
                {tinyToken ? "Configurado" : "Pendente"}
              </Badge>
            </div>

            <Alert>
              <HelpCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Como encontrar seu Token do Tiny ERP:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Acesse sua conta no Tiny ERP</li>
                  <li>Vá em "Configurações" → "Geral" → "Token API"</li>
                  <li>Clique em "Gerar Nova Chave de API"</li>
                  <li>Copie o token gerado e cole no campo abaixo</li>
                </ol>
                <Button 
                  variant="link" 
                  className="p-0 h-auto mt-2"
                  onClick={() => window.open('https://erp.tiny.com.br/configuracoes_api_web_services', '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Ir direto para Token API
                </Button>
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="tiny-token">Token de API</Label>
                <Input 
                  id="tiny-token"
                  type="text"
                  placeholder="Cole aqui o token do Tiny ERP"
                  value={tinyToken}
                  onChange={(e) => setTinyToken(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                disabled={!tinyToken || loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    const { data, error } = await supabase.functions.invoke('testar-tiny-conexao');
                    
                    if (error) {
                      toast({
                        variant: "destructive",
                        title: "Erro no teste",
                        description: error.message,
                      });
                      return;
                    }

                    if (data.success) {
                      toast({
                        title: "✅ Conexão bem-sucedida!",
                        description: `Conectado à empresa: ${data.empresa.nome}`,
                      });
                    } else {
                      toast({
                        variant: "destructive",
                        title: "Falha na conexão",
                        description: data.error,
                      });
                    }
                  } catch (error) {
                    toast({
                      variant: "destructive",
                      title: "Erro",
                      description: "Não foi possível testar a conexão",
                    });
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {loading ? "Testando..." : "Testar Conexão"}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Telegram Bot */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-foreground">Telegram Bot</h3>
                <p className="text-sm text-muted-foreground">Notificações automáticas</p>
              </div>
              <Badge variant={telegramToken && telegramChatId ? "default" : "secondary"}>
                {telegramToken && telegramChatId ? "Configurado" : "Pendente"}
              </Badge>
            </div>

            <Alert>
              <MessageSquare className="h-4 w-4" />
              <AlertDescription>
                <strong>Como configurar o Telegram:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li><strong>Criar Bot:</strong> Procure "@BotFather" no Telegram, digite "/newbot" e siga as instruções</li>
                  <li><strong>Token:</strong> Copie o token do bot criado e cole no primeiro campo</li>
                  <li><strong>Chat ID (Método 2024):</strong> Procure "@getidsbot", envie qualquer mensagem e copie o ID retornado</li>
                  <li><strong>Alternativa:</strong> Use "@userinfobot" e digite "/start" para ver seu Chat ID</li>
                  <li>O Chat ID será um número positivo (chat pessoal) ou negativo (grupo)</li>
                </ol>
                <Button 
                  variant="link" 
                  className="p-0 h-auto mt-2"
                  onClick={() => window.open('https://t.me/botfather', '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Abrir BotFather
                </Button>
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="telegram-token">Bot Token</Label>
                <Input 
                  id="telegram-token"
                  type="text"
                  placeholder="123456789:ABCdefGhIJKlmNOPQRstUVwxyZ"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="chat-id">Chat ID</Label>
                <Input 
                  id="chat-id"
                  placeholder="-1001234567890"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                />
              </div>
            </div>
            
            <Button 
              variant="secondary"
              disabled={!telegramToken || !telegramChatId || loading}
              onClick={async () => {
                setLoading(true);
                try {
                  const { data, error } = await supabase.functions.invoke('testar-telegram-bot');
                  
                  if (error) {
                    toast({
                      variant: "destructive",
                      title: "Erro no teste",
                      description: error.message,
                    });
                    return;
                  }

                  if (data.success) {
                    toast({
                      title: "✅ Mensagem enviada!",
                      description: `Bot @${data.bot.username} funcionando perfeitamente`,
                    });
                  } else {
                    toast({
                      variant: "destructive",
                      title: "Falha no envio",
                      description: data.error,
                    });
                  }
                } catch (error) {
                  toast({
                    variant: "destructive",
                    title: "Erro",
                    description: "Não foi possível enviar mensagem de teste",
                  });
                } finally {
                  setLoading(false);
                }
              }}
            >
              {loading ? "Enviando..." : "Enviar Teste"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alertas Automáticos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Alertas Automáticos de Estoque
          </CardTitle>
          <CardDescription>
            Configure alertas automáticos baseados no estoque
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="alertas-automaticos">Ativar Alertas Automáticos</Label>
                <p className="text-sm text-muted-foreground">Enviar alertas automaticamente quando há produtos em estoque baixo</p>
              </div>
              <Switch 
                id="alertas-automaticos" 
                checked={alertasAutomaticos}
                onCheckedChange={setAlertasAutomaticos}
              />
            </div>
            
            {alertasAutomaticos && (
              <div className="space-y-2">
                <Label htmlFor="intervalo-alertas">Intervalo dos Alertas</Label>
                <Select value={intervaloAlertas} onValueChange={setIntervaloAlertas}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Selecione o intervalo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Tempo Real (recomendado)</SelectItem>
                    <SelectItem value="30">A cada 30 minutos</SelectItem>
                    <SelectItem value="60">A cada 1 hora</SelectItem>
                    <SelectItem value="120">A cada 2 horas</SelectItem>
                    <SelectItem value="240">A cada 4 horas</SelectItem>
                    <SelectItem value="480">A cada 8 horas</SelectItem>
                    <SelectItem value="720">A cada 12 horas</SelectItem>
                    <SelectItem value="1440">Diariamente</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {intervaloAlertas === "0" 
                    ? "Alertas serão enviados imediatamente quando um produto atingir estoque baixo"
                    : `Alertas serão verificados automaticamente a cada ${intervaloAlertas === "60" ? "1 hora" : 
                        intervaloAlertas === "30" ? "30 minutos" :
                        intervaloAlertas === "120" ? "2 horas" :
                        intervaloAlertas === "240" ? "4 horas" :
                        intervaloAlertas === "480" ? "8 horas" :
                        intervaloAlertas === "720" ? "12 horas" :
                        intervaloAlertas === "1440" ? "24 horas" : `${intervaloAlertas} minutos`}`
                  }
                </p>
              </div>
            )}

            <Alert>
              <Bell className="h-4 w-4" />
              <AlertDescription>
                <strong>Como funcionam os alertas automáticos:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>Tempo Real:</strong> Usa triggers do banco de dados para detectar mudanças instantaneamente</li>
                  <li><strong>Intervalos:</strong> Verifica periodicamente e envia alertas se houver produtos em alerta</li>
                  <li>Alertas são enviados apenas quando há produtos com estoque baixo ou zerado</li>
                  <li>Requer configuração do Telegram Bot para funcionar</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Outras Notificações
          </CardTitle>
          <CardDescription>
            Configure outros tipos de alertas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notif-pedidos">Novos Pedidos</Label>
                <p className="text-sm text-muted-foreground">Notificar sobre novos pedidos do Tiny ERP</p>
              </div>
              <Switch id="notif-pedidos" defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notif-erros">Erros do Sistema</Label>
                <p className="text-sm text-muted-foreground">Alertas sobre falhas e problemas</p>
              </div>
              <Switch id="notif-erros" defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notif-relatorios">Relatórios Diários</Label>
                <p className="text-sm text-muted-foreground">Resumo automático diário das operações</p>
              </div>
              <Switch id="notif-relatorios" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Banco de Dados
          </CardTitle>
          <CardDescription>
            Status e configurações do Supabase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-secondary rounded-full"></div>
                <span className="font-medium text-foreground">Online</span>
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Último Backup</p>
              <p className="font-medium text-foreground mt-1">há 2 horas</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Registros</p>
              <p className="font-medium text-foreground mt-1">15.847</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="secondary">Fazer Backup</Button>
            <Button variant="outline">Ver Logs</Button>
          </div>
        </CardContent>
      </Card>

      {/* System Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Preferências do Sistema
          </CardTitle>
          <CardDescription>
            Configurações gerais e comportamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-sync">Sincronização Automática</Label>
                <p className="text-sm text-muted-foreground">Buscar pedidos automaticamente a cada 15 minutos</p>
              </div>
              <Switch id="auto-sync" defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="dark-mode">Modo Escuro</Label>
                <p className="text-sm text-muted-foreground">Interface com tema escuro</p>
              </div>
              <Switch id="dark-mode" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="items-per-page">Itens por Página</Label>
              <Input 
                id="items-per-page"
                type="number"
                placeholder="50"
                defaultValue="50"
                className="w-24"
              />
            </div>
          </div>
          
          <Button 
            variant="premium" 
            className="w-full"
            onClick={handleSaveConfig}
            disabled={loading}
          >
            {loading ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
import { Settings, Key, Bell, Database, Zap, ExternalLink, HelpCircle, MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function Configuracoes() {
  const [tinyToken, setTinyToken] = useState("");
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      // Salvar configurações no Supabase
      const updates = [];
      
      if (tinyToken) {
        updates.push(
          supabase
            .from('configuracoes')
            .upsert({ chave: 'tiny_token', valor: tinyToken, tipo: 'string' })
        );
      }
      
      if (telegramToken) {
        updates.push(
          supabase
            .from('configuracoes')
            .upsert({ chave: 'telegram_token', valor: telegramToken, tipo: 'string' })
        );
      }
      
      if (telegramChatId) {
        updates.push(
          supabase
            .from('configuracoes')
            .upsert({ chave: 'telegram_chat_id', valor: telegramChatId, tipo: 'string' })
        );
      }

      await Promise.all(updates);
      
      toast({
        title: "Configurações salvas",
        description: "As configurações foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
      });
    } finally {
      setLoading(false);
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
                disabled={!tinyToken}
                onClick={() => {
                  toast({
                    title: "Teste de conexão",
                    description: "Funcionalidade será implementada em breve.",
                  });
                }}
              >
                Testar Conexão
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
              disabled={!telegramToken || !telegramChatId}
              onClick={() => {
                toast({
                  title: "Teste de mensagem",
                  description: "Funcionalidade será implementada em breve.",
                });
              }}
            >
              Enviar Teste
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações
          </CardTitle>
          <CardDescription>
            Configure quando e como receber alertas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notif-estoque">Estoque Baixo</Label>
                <p className="text-sm text-muted-foreground">Alerta quando produtos atingem estoque mínimo</p>
              </div>
              <Switch id="notif-estoque" defaultChecked />
            </div>
            
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
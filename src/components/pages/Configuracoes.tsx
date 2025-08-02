import { Settings, Key, Bell, Database, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function Configuracoes() {
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
              <Badge variant="default">Conectado</Badge>
            </div>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="tiny-token">Token de API</Label>
                <Input 
                  id="tiny-token"
                  type="password"
                  placeholder="••••••••••••••••"
                  value="abc123def456"
                />
              </div>
              <div>
                <Label htmlFor="tiny-url">URL Base</Label>
                <Input 
                  id="tiny-url"
                  placeholder="https://api.tiny.com.br"
                  value="https://api.tiny.com.br"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="secondary">Testar Conexão</Button>
              <Button variant="outline">Atualizar</Button>
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
              <Badge variant="secondary">Configurado</Badge>
            </div>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="telegram-token">Bot Token</Label>
                <Input 
                  id="telegram-token"
                  type="password"
                  placeholder="••••••••••••••••"
                />
              </div>
              <div>
                <Label htmlFor="chat-id">Chat ID</Label>
                <Input 
                  id="chat-id"
                  placeholder="-1001234567890"
                />
              </div>
            </div>
            
            <Button variant="secondary">Enviar Teste</Button>
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
          
          <Button variant="premium" className="w-full">
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
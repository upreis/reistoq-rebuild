import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Bell, MessageSquare, Clock, TestTube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function DeParaAlertas() {
  const [loading, setLoading] = useState(false);
  const [testando, setTestando] = useState(false);
  const [configuracoes, setConfiguracoes] = useState({
    alertas_automaticos: false,
    intervalo_alertas: '60',
    telegram_token: '',
    telegram_chat_id: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  const carregarConfiguracoes = async () => {
    try {
      setLoading(true);
      
      const chaves = [
        'alertas_automaticos_depara',
        'intervalo_alertas_depara', 
        'telegram_token_depara',
        'telegram_chat_id_depara'
      ];

      const { data, error } = await supabase
        .from('configuracoes')
        .select('chave, valor')
        .in('chave', chaves);

      if (error) throw error;

      const configMap = data?.reduce((acc, item) => {
        acc[item.chave] = item.valor;
        return acc;
      }, {} as Record<string, string>) || {};

      setConfiguracoes({
        alertas_automaticos: configMap['alertas_automaticos_depara'] === 'true',
        intervalo_alertas: configMap['intervalo_alertas_depara'] || '60',
        telegram_token: configMap['telegram_token_depara'] || '',
        telegram_chat_id: configMap['telegram_chat_id_depara'] || ''
      });
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar configurações de alertas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const salvarConfiguracao = async (chave: string, valor: string) => {
    try {
      const { error } = await supabase
        .from('configuracoes')
        .upsert({
          chave: `${chave}_depara`,
          valor,
          tipo: 'string',
          descricao: `Configuração de alertas DePara: ${chave}`
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      throw error;
    }
  };

  const handleSalvarConfiguracoes = async () => {
    try {
      setLoading(true);

      await Promise.all([
        salvarConfiguracao('alertas_automaticos', configuracoes.alertas_automaticos.toString()),
        salvarConfiguracao('intervalo_alertas', configuracoes.intervalo_alertas),
        salvarConfiguracao('telegram_token', configuracoes.telegram_token),
        salvarConfiguracao('telegram_chat_id', configuracoes.telegram_chat_id)
      ]);

      toast({
        title: 'Sucesso',
        description: 'Configurações de alertas salvas com sucesso',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configurações de alertas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const testarAlerta = async () => {
    try {
      setTestando(true);

      const { data, error } = await supabase.functions.invoke('alertas-depara');

      if (error) throw error;

      toast({
        title: 'Teste enviado',
        description: 'Alerta de teste enviado para o Telegram. Verifique sua conversa.',
      });
    } catch (error: any) {
      console.error('Erro ao testar alerta:', error);
      toast({
        title: 'Erro no teste',
        description: error.message || 'Erro ao enviar alerta de teste',
        variant: 'destructive',
      });
    } finally {
      setTestando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Configurações de Alertas - SKUs Pendentes
        </CardTitle>
        <CardDescription>
          Configure alertas automáticos no Telegram para SKUs aguardando mapeamento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alertas Automáticos */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Alertas Automáticos</Label>
            <div className="text-sm text-muted-foreground">
              Enviar alertas quando há SKUs pendentes de mapeamento
            </div>
          </div>
          <Switch
            checked={configuracoes.alertas_automaticos}
            onCheckedChange={(checked) => 
              setConfiguracoes(prev => ({ ...prev, alertas_automaticos: checked }))
            }
          />
        </div>

        <Separator />

        {/* Intervalo de Alertas */}
        <div className="space-y-2">
          <Label htmlFor="intervalo">Intervalo de Alertas</Label>
          <Select
            value={configuracoes.intervalo_alertas}
            onValueChange={(value) => 
              setConfiguracoes(prev => ({ ...prev, intervalo_alertas: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Tempo Real (imediato)
                </div>
              </SelectItem>
              <SelectItem value="15">A cada 15 minutos</SelectItem>
              <SelectItem value="30">A cada 30 minutos</SelectItem>
              <SelectItem value="60">A cada 1 hora</SelectItem>
              <SelectItem value="120">A cada 2 horas</SelectItem>
              <SelectItem value="240">A cada 4 horas</SelectItem>
              <SelectItem value="480">A cada 8 horas</SelectItem>
              <SelectItem value="1440">A cada 24 horas</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground">
            {configuracoes.intervalo_alertas === '0' 
              ? 'Alertas serão enviados imediatamente quando novos SKUs pendentes forem criados'
              : `Alertas serão enviados automaticamente a cada ${configuracoes.intervalo_alertas} minutos`
            }
          </div>
        </div>

        <Separator />

        {/* Configurações do Telegram */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <h4 className="font-semibold">Configurações do Telegram</h4>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="telegram_token">Token do Bot</Label>
            <Input
              id="telegram_token"
              type="password"
              placeholder="Cole aqui o token do seu bot do Telegram"
              value={configuracoes.telegram_token}
              onChange={(e) => 
                setConfiguracoes(prev => ({ ...prev, telegram_token: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telegram_chat_id">ID do Chat</Label>
            <Input
              id="telegram_chat_id"
              placeholder="Cole aqui o ID do chat onde receber os alertas"
              value={configuracoes.telegram_chat_id}
              onChange={(e) => 
                setConfiguracoes(prev => ({ ...prev, telegram_chat_id: e.target.value }))
              }
            />
            <div className="text-sm text-muted-foreground">
              Para obter o Chat ID, envie uma mensagem para seu bot e visite: 
              <code className="mx-1 px-1 py-0.5 bg-muted rounded">
                https://api.telegram.org/bot[SEU_TOKEN]/getUpdates
              </code>
            </div>
          </div>
        </div>

        <Separator />

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={handleSalvarConfiguracoes}
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
          
          <Button
            variant="outline"
            onClick={testarAlerta}
            disabled={testando || !configuracoes.telegram_token || !configuracoes.telegram_chat_id}
            className="flex-1 sm:flex-none"
          >
            <TestTube className="h-4 w-4 mr-2" />
            {testando ? 'Testando...' : 'Testar Alerta'}
          </Button>
        </div>

        {(!configuracoes.telegram_token || !configuracoes.telegram_chat_id) && (
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            💡 Configure o token do bot e ID do chat para habilitar o teste de alertas
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Zap, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function EstoqueSyncConfig() {
  const [syncEstoqueAutomatico, setSyncEstoqueAutomatico] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tinyTokenConfigured, setTinyTokenConfigured] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadConfiguracoes = async () => {
      try {
        const { data, error } = await supabase
          .from('configuracoes')
          .select('chave, valor')
          .in('chave', ['sync_estoque_automatico', 'tiny_token']);

        if (error) throw error;

        data?.forEach((config) => {
          switch (config.chave) {
            case 'sync_estoque_automatico':
              setSyncEstoqueAutomatico(config.valor === 'true');
              break;
            case 'tiny_token':
              setTinyTokenConfigured(!!config.valor);
              break;
          }
        });
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    };

    loadConfiguracoes();
  }, []);

  const handleToggleSync = async (enabled: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('configuracoes')
        .upsert(
          { chave: 'sync_estoque_automatico', valor: enabled.toString(), tipo: 'boolean' },
          { onConflict: 'chave' }
        );

      if (error) throw error;

      setSyncEstoqueAutomatico(enabled);
      
      toast({
        title: enabled ? "Sincronização ativada" : "Sincronização desativada",
        description: enabled 
          ? "Todas as movimentações de estoque serão sincronizadas automaticamente com o Tiny ERP."
          : "A sincronização automática foi desativada. Você pode sincronizar manualmente quando necessário.",
      });
    } catch (error: any) {
      console.error('Erro ao atualizar configuração:', error);
      toast({
        title: "Erro ao salvar configuração",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Sincronização com Tiny ERP
        </CardTitle>
        <CardDescription>
          Configure a sincronização automática de movimentações de estoque
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status da integração */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            {tinyTokenConfigured ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <div>
              <p className="font-medium">Tiny ERP</p>
              <p className="text-sm text-muted-foreground">
                {tinyTokenConfigured ? "Token configurado" : "Token não configurado"}
              </p>
            </div>
          </div>
          <Badge variant={tinyTokenConfigured ? "default" : "secondary"}>
            {tinyTokenConfigured ? "Conectado" : "Desconectado"}
          </Badge>
        </div>

        {/* Configuração de sincronização */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="sync-estoque-auto">Sincronização Automática</Label>
            <p className="text-sm text-muted-foreground">
              Sincronizar todas as movimentações de estoque automaticamente
            </p>
          </div>
          <Switch 
            id="sync-estoque-auto"
            checked={syncEstoqueAutomatico}
            onCheckedChange={handleToggleSync}
            disabled={!tinyTokenConfigured || loading}
          />
        </div>

        {/* Status atual */}
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <Zap className={`h-4 w-4 ${syncEstoqueAutomatico ? 'text-green-500' : 'text-gray-400'}`} />
          <span className="text-sm font-medium">
            Status: {syncEstoqueAutomatico ? 'Ativo' : 'Inativo'}
          </span>
        </div>

        {/* Avisos e instruções */}
        {!tinyTokenConfigured && (
          <Alert>
            <AlertDescription>
              Para ativar a sincronização automática, você precisa primeiro configurar o token do Tiny ERP na página de Configurações.
            </AlertDescription>
          </Alert>
        )}

        {syncEstoqueAutomatico && tinyTokenConfigured && (
          <Alert>
            <AlertDescription>
              <strong>Sincronização ativa!</strong> Todas as movimentações de estoque (entradas, saídas e ajustes) serão automaticamente sincronizadas com o Tiny ERP.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
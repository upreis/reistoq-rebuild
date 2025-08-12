import { useState, useEffect } from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Settings, ChevronDown, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function EstoqueSyncConfig() {
  const [syncEstoqueAutomatico, setSyncEstoqueAutomatico] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tinyTokenConfigured, setTinyTokenConfigured] = useState(false);
  const [configAberta, setConfigAberta] = useState(false);
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
      const { data: orgId } = await supabase.rpc('get_current_org_id');
      if (!orgId) throw new Error('Organização não encontrada');
      const { error } = await supabase
        .from('configuracoes')
        .upsert(
          { organization_id: orgId, chave: 'sync_estoque_automatico', valor: enabled.toString(), tipo: 'boolean' },
          { onConflict: 'organization_id,chave' }
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
              {!syncEstoqueAutomatico && (
                <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 text-xs px-2 py-0.5">
                  Manual
                </Badge>
              )}
              {syncEstoqueAutomatico && (
                <Badge variant="default" className="text-xs px-2 py-0.5">
                  Automático
                </Badge>
              )}
              <span className="text-xs text-green-600">
                Pronto
              </span>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 space-y-3">
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

            {/* Sincronização Automática */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="sync-estoque-auto" className="text-sm font-medium">
                  Sincronização Automática
                </Label>
                <p className="text-xs text-muted-foreground">
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
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
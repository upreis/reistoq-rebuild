import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Iniciando sincronização automática...');

    // Verificar se a sincronização automática está habilitada
    const { data: configSync } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'sync_automatico')
      .single();

    const { data: configInterval } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'sync_intervalo')
      .single();

    if (configSync?.valor !== 'true') {
      console.log('⏸️ Sincronização automática desabilitada');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Sincronização automática está desabilitada',
          sync_disabled: true
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const intervalMinutos = parseInt(configInterval?.valor || '30');
    console.log(`⏰ Sincronização configurada para cada ${intervalMinutos} minutos`);

    // Obter última sincronização
    const { data: ultimaSync } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'ultima_sync_automatica')
      .single();

    const agora = new Date();
    const ultimaSyncDate = ultimaSync?.valor ? new Date(ultimaSync.valor) : new Date(0);
    const diffMinutos = Math.floor((agora.getTime() - ultimaSyncDate.getTime()) / (1000 * 60));

    if (diffMinutos < intervalMinutos) {
      console.log(`⏳ Aguardando intervalo: ${diffMinutos}/${intervalMinutos} minutos`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Próxima sincronização em ${intervalMinutos - diffMinutos} minutos`,
          next_sync_in_minutes: intervalMinutos - diffMinutos
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Executar sincronização
    console.log('🔄 Executando sincronização...');
    
    const { data: syncResult, error: syncError } = await supabase.functions.invoke('sync-pedidos-rapido', {
      body: { 
        filters: {
          // Sincronizar apenas pedidos dos últimos 7 dias
          dataInicio: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      }
    });

    if (syncError) {
      console.error('❌ Erro na sincronização:', syncError);
      throw syncError;
    }

    // Registrar histórico da sincronização
    await supabase
      .from('historico')
      .insert({
        tipo: 'sync_automatico',
        descricao: `Sincronização automática executada - ${syncResult?.resumo?.total_processados || 0} pedidos processados`,
        detalhes: syncResult
      });

    // Atualizar timestamp da última sincronização
    await supabase
      .from('configuracoes')
      .upsert(
        { 
          chave: 'ultima_sync_automatica', 
          valor: agora.toISOString(),
          tipo: 'datetime'
        },
        { onConflict: 'chave' }
      );

    // Auto-mapear SKUs dos novos pedidos se habilitado
    const { data: autoMapConfig } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'auto_mapear_sku')
      .single();

    if (autoMapConfig?.valor === 'true' && syncResult?.novos_pedidos?.length > 0) {
      console.log('🗺️ Executando auto-mapeamento de SKUs...');
      
      try {
        for (const pedido of syncResult.novos_pedidos) {
          if (pedido.itens && pedido.itens.length > 0) {
            const { data: autoMapResult } = await supabase.functions.invoke('auto-mapear-sku', {
              body: {
                sku_pedido: pedido.itens[0].sku,
                observacoes: `Auto-mapeamento via sync automático - Pedido ${pedido.numero}`
              }
            });
            
            if (autoMapResult?.success && !autoMapResult?.existing) {
              console.log(`✅ SKU ${pedido.itens[0].sku} auto-mapeado`);
            }
          }
        }
      } catch (autoMapError) {
        console.error('⚠️ Erro no auto-mapeamento:', autoMapError);
        // Não falhar a sincronização por causa do auto-mapeamento
      }
    }

    console.log('✅ Sincronização automática concluída!');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Sincronização automática executada com sucesso',
        resultado: syncResult,
        proxima_sync: new Date(agora.getTime() + intervalMinutos * 60 * 1000).toISOString()
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('❌ Erro na sincronização automática:', error);
    
    // Registrar erro no histórico
    await supabase
      .from('historico')
      .insert({
        tipo: 'sync_automatico_erro',
        descricao: `Erro na sincronização automática: ${error.message}`,
        detalhes: { error: error.toString() }
      });

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.toString()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
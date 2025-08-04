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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Verificando se alertas automáticos DePara estão habilitados...');

    // Verificar se alertas automáticos estão habilitados
    const { data: alertasConfig, error: alertasError } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'alertas_automaticos_depara')
      .single();

    if (alertasError) {
      console.log('Configuração de alertas DePara não encontrada, assumindo desabilitado');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Alertas automáticos DePara não configurados',
          alertas_habilitados: false
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const alertasHabilitados = alertasConfig.valor === 'true';
    console.log('Alertas DePara habilitados:', alertasHabilitados);

    if (!alertasHabilitados) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Alertas automáticos DePara estão desabilitados',
          alertas_habilitados: false
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Chamar a função de alertas
    console.log('Chamando função de alertas DePara...');
    const { data: alertaResponse, error: alertaError } = await supabase.functions.invoke('alertas-depara');

    if (alertaError) {
      console.error('Erro ao chamar função de alertas DePara:', alertaError);
      throw alertaError;
    }

    console.log('Função de alertas DePara executada com sucesso:', alertaResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Cron de alertas DePara executado com sucesso',
        alertas_habilitados: true,
        alerta_response: alertaResponse
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Erro no cron de alertas DePara:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
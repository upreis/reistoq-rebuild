import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuração do Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Verificando se alertas automáticos estão ativados...');

    // Verificar se os alertas automáticos estão ativados
    const { data: configAlertas, error: errorConfig } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'alertas_automaticos')
      .single();

    if (errorConfig || !configAlertas) {
      console.log('Configuração de alertas automáticos não encontrada');
      return new Response(
        JSON.stringify({ message: 'Configuração não encontrada' }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    if (configAlertas.valor !== 'true') {
      console.log('Alertas automáticos estão desativados');
      return new Response(
        JSON.stringify({ message: 'Alertas automáticos desativados' }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    console.log('Alertas automáticos ativados, chamando função de alertas...');

    // Chamar a função de alertas-estoque
    const { data, error } = await supabase.functions.invoke('alertas-estoque');

    if (error) {
      throw error;
    }

    console.log('Função de alertas executada com sucesso:', data);

    return new Response(
      JSON.stringify({ 
        message: 'Verificação automática de alertas executada com sucesso',
        resultado: data 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Erro na verificação automática de alertas:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
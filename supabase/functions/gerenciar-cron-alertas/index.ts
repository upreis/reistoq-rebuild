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

interface RequestBody {
  ativar: boolean;
  intervalo_minutos?: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ativar, intervalo_minutos }: RequestBody = await req.json();
    
    console.log(`Gerenciando cron job - Ativar: ${ativar}, Intervalo: ${intervalo_minutos} minutos`);

    // Primeiro, remover qualquer cron job existente para alertas de estoque
    const { error: errorRemove } = await supabase.rpc('execute_sql', {
      query: "SELECT cron.unschedule('alertas-estoque-automaticos');"
    });

    if (errorRemove) {
      console.log('Nenhum cron job existente encontrado (normal na primeira execução)');
    }

    if (ativar && intervalo_minutos && intervalo_minutos > 0) {
      // Criar expressão cron baseada no intervalo
      let cronExpression = '';
      
      if (intervalo_minutos === 30) {
        cronExpression = '*/30 * * * *'; // A cada 30 minutos
      } else if (intervalo_minutos === 60) {
        cronExpression = '0 * * * *'; // A cada hora
      } else if (intervalo_minutos === 120) {
        cronExpression = '0 */2 * * *'; // A cada 2 horas
      } else if (intervalo_minutos === 240) {
        cronExpression = '0 */4 * * *'; // A cada 4 horas
      } else if (intervalo_minutos === 480) {
        cronExpression = '0 */8 * * *'; // A cada 8 horas
      } else if (intervalo_minutos === 720) {
        cronExpression = '0 */12 * * *'; // A cada 12 horas
      } else if (intervalo_minutos === 1440) {
        cronExpression = '0 0 * * *'; // Diariamente
      } else {
        // Para outros valores, usar a cada X minutos
        cronExpression = `*/${intervalo_minutos} * * * *`;
      }

      // Criar novo cron job
      const cronQuery = `
        SELECT cron.schedule(
          'alertas-estoque-automaticos',
          '${cronExpression}',
          $$
          SELECT net.http_post(
            url:='${supabaseUrl}/functions/v1/cron-alertas-estoque',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}"}'::jsonb,
            body:='{"trigger": "cron"}'::jsonb
          ) as request_id;
          $$
        );
      `;

      const { error: errorCreate } = await supabase.rpc('execute_sql', {
        query: cronQuery
      });

      if (errorCreate) {
        throw new Error(`Erro ao criar cron job: ${errorCreate.message}`);
      }

      console.log(`Cron job criado com sucesso: ${cronExpression}`);
    }

    return new Response(
      JSON.stringify({ 
        message: ativar ? 
          `Alertas automáticos ativados (${intervalo_minutos} minutos)` : 
          'Alertas automáticos desativados',
        ativado: ativar,
        intervalo: intervalo_minutos
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Erro ao gerenciar cron job:', error);
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
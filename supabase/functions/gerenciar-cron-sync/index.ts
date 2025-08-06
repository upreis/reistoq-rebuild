import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface RequestBody {
  ativar: boolean;
  intervalo_minutos?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ativar, intervalo_minutos }: RequestBody = await req.json();
    
    console.log(`Gerenciando cron job de sync - Ativar: ${ativar}, Intervalo: ${intervalo_minutos} minutos`);

    // Remover cron job existente
    const { error: errorRemove } = await supabase.rpc('execute_sql', {
      query: "SELECT cron.unschedule('sync-automatico-pedidos');"
    });

    if (errorRemove) {
      console.log('Nenhum cron job de sync existente encontrado');
    }

    if (ativar && intervalo_minutos && intervalo_minutos > 0) {
      // Criar expressão cron
      let cronExpression = '';
      
      if (intervalo_minutos === 5) {
        cronExpression = '*/5 * * * *'; // A cada 5 minutos
      } else if (intervalo_minutos === 15) {
        cronExpression = '*/15 * * * *'; // A cada 15 minutos
      } else if (intervalo_minutos === 30) {
        cronExpression = '*/30 * * * *'; // A cada 30 minutos
      } else if (intervalo_minutos === 60) {
        cronExpression = '0 * * * *'; // A cada hora
      } else if (intervalo_minutos === 120) {
        cronExpression = '0 */2 * * *'; // A cada 2 horas
      } else if (intervalo_minutos === 240) {
        cronExpression = '0 */4 * * *'; // A cada 4 horas
      } else {
        cronExpression = `*/${intervalo_minutos} * * * *`;
      }

      // Criar novo cron job para sincronização
      const cronQuery = `
        SELECT cron.schedule(
          'sync-automatico-pedidos',
          '${cronExpression}',
          $$
          SELECT net.http_post(
            url:='${supabaseUrl}/functions/v1/sync-automatico',
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
        throw new Error(`Erro ao criar cron job de sync: ${errorCreate.message}`);
      }

      console.log(`Cron job de sync criado: ${cronExpression}`);

      // Criar também cron job para alertas inteligentes (executa a cada hora)
      await supabase.rpc('execute_sql', {
        query: "SELECT cron.unschedule('alertas-inteligentes-automaticos');"
      });

      const cronAlertasQuery = `
        SELECT cron.schedule(
          'alertas-inteligentes-automaticos',
          '0 * * * *',
          $$
          SELECT net.http_post(
            url:='${supabaseUrl}/functions/v1/alertas-inteligentes',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}"}'::jsonb,
            body:='{"trigger": "cron"}'::jsonb
          ) as request_id;
          $$
        );
      `;

      await supabase.rpc('execute_sql', {
        query: cronAlertasQuery
      });

      console.log('Cron job de alertas inteligentes criado');
    }

    return new Response(
      JSON.stringify({ 
        message: ativar ? 
          `Sincronização automática ativada (${intervalo_minutos} minutos)` : 
          'Sincronização automática desativada',
        ativado: ativar,
        intervalo: intervalo_minutos
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Erro ao gerenciar cron job de sync:', error);
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
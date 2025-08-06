import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncControlRequest {
  action: 'start' | 'pause' | 'resume' | 'stop' | 'status';
  process_name: string;
  progress?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, process_name, progress }: SyncControlRequest = await req.json();

    console.log(`📋 Sync Control - Ação: ${action}, Processo: ${process_name}`);

    switch (action) {
      case 'start':
        {
          const { data, error } = await supabase
            .from('sync_control')
            .update({
              status: 'running',
              progress: progress || { 
                started_at: new Date().toISOString(),
                total_items: 0,
                processed_items: 0,
                current_step: 'Iniciando...'
              }
            })
            .eq('process_name', process_name)
            .select()
            .single();

          if (error) throw error;

          console.log(`✅ Processo ${process_name} iniciado`);
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              status: 'running',
              message: `Processo ${process_name} iniciado`,
              data 
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

      case 'pause':
        {
          const { data, error } = await supabase
            .from('sync_control')
            .update({
              status: 'paused',
              progress: {
                ...progress,
                paused_at: new Date().toISOString()
              }
            })
            .eq('process_name', process_name)
            .select()
            .single();

          if (error) throw error;

          console.log(`⏸️ Processo ${process_name} pausado`);
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              status: 'paused',
              message: `Processo ${process_name} pausado`,
              data 
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

      case 'resume':
        {
          const { data, error } = await supabase
            .from('sync_control')
            .update({
              status: 'running',
              progress: {
                ...progress,
                resumed_at: new Date().toISOString()
              }
            })
            .eq('process_name', process_name)
            .select()
            .single();

          if (error) throw error;

          console.log(`▶️ Processo ${process_name} retomado`);
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              status: 'running',
              message: `Processo ${process_name} retomado`,
              data 
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

      case 'stop':
        {
          const { data, error } = await supabase
            .from('sync_control')
            .update({
              status: 'stopped',
              progress: {
                ...progress,
                stopped_at: new Date().toISOString()
              }
            })
            .eq('process_name', process_name)
            .select()
            .single();

          if (error) throw error;

          console.log(`⏹️ Processo ${process_name} interrompido`);
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              status: 'stopped',
              message: `Processo ${process_name} interrompido`,
              data 
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

      case 'status':
        {
          const { data, error } = await supabase
            .from('sync_control')
            .select('*')
            .eq('process_name', process_name)
            .single();

          if (error) throw error;

          return new Response(
            JSON.stringify({ 
              success: true, 
              data
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

      default:
        return new Response(
          JSON.stringify({ 
            error: 'Ação inválida',
            valid_actions: ['start', 'pause', 'resume', 'stop', 'status']
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

  } catch (error) {
    console.error('Erro no controle de sync:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
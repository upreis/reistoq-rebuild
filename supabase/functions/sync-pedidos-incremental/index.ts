import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessarParams {
  filtros?: {
    dataInicio?: string;
    dataFim?: string;
    situacao?: string;
  };
}

Deno.serve(async (req) => {
  console.log('🚀 [INÍCIO] sync-pedidos-incremental executando...');
  console.log('📊 [DEBUG] Method:', req.method);
  console.log('📊 [DEBUG] URL:', req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ [CORS] Respondendo OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    console.log('🔍 [DEBUG] Iniciando parsing do body...');
    
    let params: ProcessarParams = {};
    
    if (req.body) {
      try {
        const bodyText = await req.text();
        console.log('📝 [DEBUG] Body recebido:', bodyText);
        params = JSON.parse(bodyText);
        console.log('✅ [DEBUG] Params parseados:', JSON.stringify(params));
      } catch (parseError) {
        console.error('❌ [ERROR] Erro ao parsear JSON:', parseError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'JSON inválido: ' + parseError.message 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    console.log('🏗️ [DEBUG] Inicializando Supabase client...');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('🔑 [DEBUG] SUPABASE_URL exists:', !!supabaseUrl);
    console.log('🔑 [DEBUG] SERVICE_KEY exists:', !!supabaseServiceKey);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ [ERROR] Variáveis de ambiente faltando');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Configuração Supabase incompleta' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('📦 [DEBUG] Buscando configurações...');
    
    // Buscar token do Tiny ERP
    const { data: config, error: configError } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'tiny_erp_token')
      .single();

    if (configError) {
      console.error('❌ [ERROR] Erro ao buscar config:', configError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao buscar configurações: ' + configError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!config?.valor) {
      console.error('❌ [ERROR] Token não encontrado');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token Tiny ERP não configurado' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const tinyToken = config.valor;
    console.log('✅ [DEBUG] Token encontrado, length:', tinyToken.length);

    // Chamar função sync-pedidos-rapido
    console.log('📡 [DEBUG] Chamando sync-pedidos-rapido...');
    console.log('📡 [DEBUG] Params para enviar:', JSON.stringify(params));
    
    const { data: result, error: functionError } = await supabase.functions.invoke(
      'sync-pedidos-rapido',
      {
        body: params
      }
    );

    if (functionError) {
      console.error('❌ [ERROR] Erro na função sync-pedidos-rapido:', functionError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao buscar pedidos: ' + functionError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ [SUCCESS] Dados recebidos:', result ? 'SIM' : 'NÃO');
    console.log('📊 [DEBUG] Tipo do resultado:', typeof result);
    
    if (result && typeof result === 'object') {
      console.log('📊 [DEBUG] Keys do resultado:', Object.keys(result));
    }

    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    console.log(`⏱️ [TIMING] Tempo total de execução: ${executionTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        tempo_execucao_ms: executionTime,
        debug: {
          params_recebidos: params,
          token_configurado: !!tinyToken,
          resultado_tipo: typeof result
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ [FATAL ERROR] Erro não tratado:', error);
    console.error('❌ [STACK]', error.stack);
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro interno: ' + error.message,
        tempo_execucao_ms: executionTime,
        debug: {
          error_type: error.constructor.name,
          error_stack: error.stack
        }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
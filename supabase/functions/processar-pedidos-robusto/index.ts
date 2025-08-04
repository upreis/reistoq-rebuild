import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configurações robustas
const CACHE_TTL_MINUTES = 15;
const BATCH_SIZE = 2; // Máxima estabilidade
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 2000; // 2 segundos
const MAX_REQUESTS_PER_MINUTE = 10; // Conservador
const REQUEST_TIMEOUT = 30000; // 30 segundos

// Rate limiting rigoroso
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const cacheMap = new Map<string, { data: any; timestamp: number }>();

interface TinyPedido {
  id: string;
  numero: string;
  data_pedido: string;
  nome_cliente: string;
  valor_total: number;
  situacao: string;
  itens?: TinyItemPedido[];
}

interface TinyItemPedido {
  id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  codigo_produto: string;
}

// Rate limiting ultra-rigoroso
function checkRateLimit(clientIP: string): boolean {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientIP);
  
  if (!clientData || now > clientData.resetTime) {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + 60000 });
    return true;
  }
  
  if (clientData.count >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  clientData.count++;
  return true;
}

// Cache inteligente
function getFromCache(key: string): any | null {
  const cached = cacheMap.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MINUTES * 60 * 1000) {
    return cached.data;
  }
  return null;
}

function setCache(key: string, data: any): void {
  cacheMap.set(key, { data, timestamp: Date.now() });
}

// Sleep function
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Função API robusta com tratamento completo de erros
async function makeApiCallWithFullErrorHandling(url: string, params: URLSearchParams, context: string): Promise<any> {
  for (let tentativa = 1; tentativa <= MAX_RETRIES; tentativa++) {
    try {
      console.log(`🔄 [${context}] Tentativa ${tentativa}/${MAX_RETRIES}`);
      
      // Promise de fetch
      const fetchPromise = fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Supabase-Edge-Function/1.0',
        },
        body: params.toString()
      });

      // Promise de timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout após 30s`)), REQUEST_TIMEOUT);
      });

      // Race entre fetch e timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      console.log(`📡 [${context}] Status HTTP: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ [${context}] Requisição bem-sucedida`);
      return data;

    } catch (error) {
      console.error(`❌ [${context}] Erro tentativa ${tentativa}:`, error.message);
      
      if (tentativa === MAX_RETRIES) {
        throw error;
      }

      // Backoff exponencial com jitter
      const delay = BASE_RETRY_DELAY * Math.pow(2, tentativa - 1) + Math.random() * 1000;
      console.log(`⏱️ [${context}] Aguardando ${Math.round(delay)}ms antes da próxima tentativa`);
      await sleep(delay);
    }
  }
  
  throw new Error(`Falha após ${MAX_RETRIES} tentativas`);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('🚀 Iniciando processamento robusto de pedidos Tiny ERP');

  try {
    // Rate limiting por IP
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    
    if (!checkRateLimit(clientIP)) {
      console.warn(`🚫 Rate limit excedido para IP: ${clientIP}`);
      return new Response(JSON.stringify({
        erro: 'Muitas requisições. Aguarde 1 minuto.',
        codigo: 'RATE_LIMIT_EXCEEDED',
        retry_after: 60
      }), { 
        status: 429, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Parsing JSON seguro
    let requestData: any = {};
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError);
      return new Response(JSON.stringify({
        erro: 'JSON malformado',
        codigo: 'INVALID_JSON'
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { filtros = {} } = requestData;
    console.log('📋 Filtros recebidos:', JSON.stringify(filtros));

    // Cache key baseado nos filtros
    const cacheKey = `pedidos_${JSON.stringify(filtros)}`;
    const cachedResult = getFromCache(cacheKey);
    
    if (cachedResult) {
      console.log('🎯 Retornando dados do cache');
      return new Response(JSON.stringify({
        sucesso: true,
        dados: cachedResult,
        fonte: 'cache',
        tempo_execucao: Date.now() - startTime
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Inicializar Supabase com timeout
    const supabase = createClient(
      'https://tdjyfqnxvjgossuncpwm.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkanlmcW54dmpnb3NzdW5jcHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTczNTMsImV4cCI6MjA2OTQ3MzM1M30.qrEBpARgfuWF74zHoRzGJyWjgxN_oCG5DdKjPVGJYxk'
    );

    console.log('🔑 Buscando credenciais do Tiny ERP...');
    
    // Timeout para buscar configurações
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout ao buscar configurações')), 10000)
    );

    const { data: configData, error: configError } = await Promise.race([
      supabase.from('configuracoes').select('chave, valor').in('chave', ['tiny_erp_token', 'tiny_erp_url']),
      timeoutPromise
    ]);

    if (configError) {
      throw new Error(`Erro ao buscar configurações: ${configError.message}`);
    }

    if (!configData || configData.length === 0) {
      throw new Error('Configurações do Tiny ERP não encontradas');
    }

    const configMap = Object.fromEntries(configData.map(c => [c.chave, c.valor]));
    const tinyToken = configMap.tiny_erp_token;
    const tinyApiUrl = configMap.tiny_erp_url;

    if (!tinyToken || !tinyApiUrl) {
      throw new Error('Token ou URL do Tiny ERP não configurados');
    }

    console.log('✅ Credenciais obtidas com sucesso');

    // Buscar pedidos da API do Tiny de forma robusta
    const pedidosColetados: TinyPedido[] = [];
    const pagina = 1; // Começar com apenas 1 página para máxima estabilidade
    
    console.log(`📄 Processando página ${pagina} com máxima robustez...`);

    const params = new URLSearchParams({
      token: tinyToken,
      formato: 'JSON',
      pagina: pagina.toString(),
      com_itens: 'S' // Tentar buscar com itens primeiro
    });

    // Aplicar filtros se fornecidos
    if (filtros.dataInicio) {
      const dataFormatada = new Date(filtros.dataInicio).toLocaleDateString('pt-BR');
      params.append('dataInicial', dataFormatada);
      console.log(`📅 Filtro data inicial aplicado: ${dataFormatada}`);
    }

    if (filtros.dataFim) {
      const dataFormatada = new Date(filtros.dataFim).toLocaleDateString('pt-BR');
      params.append('dataFinal', dataFormatada);
      console.log(`📅 Filtro data final aplicado: ${dataFormatada}`);
    }

    try {
      const apiResponse = await makeApiCallWithFullErrorHandling(
        `${tinyApiUrl}/pedidos.pesquisar.php`,
        params,
        `Página_${pagina}`
      );

      if (apiResponse.retorno?.status === 'OK' && apiResponse.retorno?.pedidos) {
        const pedidosPagina = Array.isArray(apiResponse.retorno.pedidos) 
          ? apiResponse.retorno.pedidos.map((p: any) => p.pedido)
          : [apiResponse.retorno.pedidos.pedido];

        pedidosColetados.push(...pedidosPagina);
        console.log(`✅ Página ${pagina}: ${pedidosPagina.length} pedidos coletados`);
      } else {
        console.warn(`⚠️ Resposta inesperada da API na página ${pagina}:`, apiResponse);
      }

    } catch (error) {
      console.error(`❌ Erro crítico ao processar página ${pagina}:`, error.message);
      // Continuar mesmo com erro (robustez)
    }

    console.log(`🎉 Total coletado: ${pedidosColetados.length} pedidos`);

    // Salvar no banco de dados de forma robusta
    let pedidosSalvos = 0;
    let itensSalvos = 0;

    for (const pedido of pedidosColetados) {
      try {
        // Salvar pedido principal
        const { data: pedidoData, error: pedidoError } = await supabase
          .from('pedidos')
          .upsert({
            id: pedido.id,
            numero: pedido.numero,
            data_pedido: pedido.data_pedido,
            nome_cliente: pedido.nome_cliente,
            valor_total: parseFloat(pedido.valor_total?.toString() || '0'),
            situacao: pedido.situacao
          })
          .select()
          .single();

        if (pedidoError) {
          console.error(`❌ Erro ao salvar pedido ${pedido.numero}:`, pedidoError);
          continue;
        }

        pedidosSalvos++;

        // Salvar itens se existirem
        if (pedido.itens && Array.isArray(pedido.itens)) {
          for (const item of pedido.itens) {
            try {
              const { error: itemError } = await supabase
                .from('itens_pedidos')
                .upsert({
                  id: `${pedido.id}_${item.id}`,
                  pedido_id: pedido.id,
                  codigo_produto: item.codigo_produto,
                  descricao: item.descricao,
                  quantidade: parseInt(item.quantidade?.toString() || '0'),
                  valor_unitario: parseFloat(item.valor_unitario?.toString() || '0'),
                  valor_total: parseFloat(item.valor_total?.toString() || '0')
                });

              if (itemError) {
                console.error(`❌ Erro ao salvar item do pedido ${pedido.numero}:`, itemError);
              } else {
                itensSalvos++;
              }
            } catch (itemException) {
              console.error(`❌ Exceção ao processar item do pedido ${pedido.numero}:`, itemException);
            }
          }
        }

      } catch (pedidoException) {
        console.error(`❌ Exceção ao processar pedido ${pedido.numero}:`, pedidoException);
      }
    }

    const resultado = {
      total_coletados: pedidosColetados.length,
      pedidos_salvos: pedidosSalvos,
      itens_salvos: itensSalvos,
      tempo_execucao: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    // Salvar no cache
    setCache(cacheKey, resultado);

    console.log('🎉 Processamento concluído com sucesso:', resultado);

    return new Response(JSON.stringify({
      sucesso: true,
      dados: resultado,
      fonte: 'api',
      debug_info: {
        configuracoes_encontradas: !!tinyToken && !!tinyApiUrl,
        filtros_aplicados: filtros,
        cache_key: cacheKey
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ ERRO CRÍTICO no processamento:', error);
    
    return new Response(JSON.stringify({ 
      sucesso: false,
      erro: 'Erro crítico no processamento',
      codigo: 'CRITICAL_ERROR',
      debug_info: {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        tempo_execucao: Date.now() - startTime
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
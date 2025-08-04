import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS_PER_MINUTE = 10; // Reduzido para 10 req/min
const RATE_LIMIT_WINDOW = 60 * 1000;

// Cache em memória
const cacheMap = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MINUTES = 15; // Aumentado para 15 minutos

// Timeout personalizado para evitar travamentos
const FUNCTION_TIMEOUT = 4 * 60 * 1000; // 4 minutos máximo

interface TinyPedido {
  id: string;
  numero: string;
  numero_ecommerce?: string;
  data_pedido: string;
  data_prevista?: string;
  situacao: string;
  codigo_rastreamento?: string;
  url_rastreamento?: string;
  nome_cliente: string;
  cpf_cnpj?: string;
  valor_frete: number;
  valor_desconto: number;
  valor_total: number;
  obs?: string;
  obs_interna?: string;
  itens?: TinyItemPedido[];
}

interface TinyItemPedido {
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  ncm?: string;
  codigo_barras?: string;
  observacoes?: string;
}

interface TinyApiResponse {
  retorno: {
    status: string;
    codigo_erro?: number;
    erros?: Array<{ erro: string }>;
    pedidos?: Array<{
      pedido: {
        id?: string;
        numero?: string;
        numero_ecommerce?: string;
        data_pedido?: string;
        data_prevista?: string;
        situacao?: string;
        codigo_rastreamento?: string;
        url_rastreamento?: string;
        cliente?: {
          nome?: string;
          cpf_cnpj?: string;
        };
        nome_cliente?: string;
        cpf_cnpj?: string;
        valor_frete?: string | number;
        valor_desconto?: string | number;
        total_pedido?: string | number;
        valor_total?: string | number;
        obs?: string;
        obs_interna?: string;
        itens?: any[];
        [key: string]: any;
      }
    }>;
    numero_paginas?: number;
    total_registros?: number;
  };
}

// Função para verificar rate limiting
function checkRateLimit(clientIP: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(clientIP);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }

  entry.count++;
  return true;
}

// Função para verificar cache
function getFromCache(key: string): any | null {
  const cached = cacheMap.get(key);
  if (cached && (Date.now() - cached.timestamp) < (CACHE_TTL_MINUTES * 60 * 1000)) {
    return cached.data;
  }
  return null;
}

// Função para salvar no cache
function setCache(key: string, data: any): void {
  cacheMap.set(key, { data, timestamp: Date.now() });
}

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Converter data DD/MM/YYYY para YYYY-MM-DD
function convertDateFormat(dateStr: string): string {
  if (!dateStr) return '';
  
  // Se já está no formato YYYY-MM-DD, retorna como está
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }
  
  // Se está no formato DD/MM/YYYY, converte
  if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [dia, mes, ano] = dateStr.split('/');
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }
  
  return dateStr;
}

// Função para fazer requisição com timeout e retry
async function makeApiCallWithTimeout(url: string, params: URLSearchParams, timeoutMs = 30000): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    // Detecta API bloqueada
    if (data.retorno?.codigo_erro === 6) {
      throw new Error('API_BLOCKED');
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('TIMEOUT');
    }
    
    if (error.message === 'API_BLOCKED') {
      throw new Error('API do Tiny ERP temporariamente bloqueada. Aguarde 2-3 minutos.');
    }
    
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Timeout geral da função
  const functionTimeout = setTimeout(() => {
    console.error('Função atingiu timeout de 4 minutos');
  }, FUNCTION_TIMEOUT);

  try {
    // Rate limiting básico
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    
    if (!checkRateLimit(clientIP)) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit excedido. Máximo 10 requisições por minuto.',
        codigo: 'RATE_LIMIT'
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar configurações do Tiny ERP
    const { data: configs } = await supabaseClient
      .from('configuracoes')
      .select('chave, valor')
      .in('chave', ['tiny_token', 'tiny_api_url']);

    const tinyToken = configs?.find(c => c.chave === 'tiny_token')?.valor;
    const tinyApiUrl = configs?.find(c => c.chave === 'tiny_api_url')?.valor || 'https://api.tiny.com.br/api2';

    if (!tinyToken) {
      throw new Error('Token do Tiny ERP não configurado');
    }

    const { filtros = {} } = await req.json().catch(() => ({}));
    
    // Criar chave de cache baseada nos filtros
    const cacheKey = `pedidos-${filtros.dataInicio || 'sem-data'}-${filtros.dataFim || 'sem-data'}-${JSON.stringify(filtros.situacoes || [])}-v2`;
    
    // Verificar cache primeiro
    const cachedResult = getFromCache(cacheKey);
    if (cachedResult) {
      console.log('Retornando dados do cache');
      clearTimeout(functionTimeout);
      return new Response(JSON.stringify({
        ...cachedResult,
        fromCache: true,
        message: 'Dados retornados do cache (atualizados há menos de 15 minutos)'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Iniciando sincronização com timeout de 4 minutos');
    console.log('Filtros recebidos:', filtros);

    // ✅ ESTRATÉGIA SIMPLIFICADA: Buscar apenas primeira página com com_itens=S
    const params = new URLSearchParams({
      token: tinyToken,
      formato: 'JSON',
      pagina: '1',
      com_itens: 'S' // ✅ CRUCIAL: busca com itens já incluídos
    });

    // Aplicar filtros se fornecidos - usando formato correto DD/MM/YYYY para API do Tiny
    if (filtros.dataInicio) {
      // Converter YYYY-MM-DD para DD/MM/YYYY (formato esperado pela API do Tiny)
      let dataFormatada = filtros.dataInicio;
      if (dataFormatada.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [ano, mes, dia] = dataFormatada.split('-');
        dataFormatada = `${dia}/${mes}/${ano}`;
      }
      params.append('dataInicio', dataFormatada);
      console.log('Data inicial formatada:', dataFormatada);
    }
    
    if (filtros.dataFim) {
      // Converter YYYY-MM-DD para DD/MM/YYYY (formato esperado pela API do Tiny)
      let dataFormatada = filtros.dataFim;
      if (dataFormatada.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [ano, mes, dia] = dataFormatada.split('-');
        dataFormatada = `${dia}/${mes}/${ano}`;
      }
      params.append('dataFim', dataFormatada);
      console.log('Data final formatada:', dataFormatada);
    }
    
    if (filtros.situacao && filtros.situacao !== 'todas') {
      params.append('situacao', filtros.situacao);
    }

    console.log('Fazendo requisição para API do Tiny...');
    console.log('Parâmetros:', params.toString());

    // Fazer requisição com timeout de 30 segundos
    const tinyData: TinyApiResponse = await makeApiCallWithTimeout(
      `${tinyApiUrl}/pedidos.pesquisa.php`, 
      params, 
      30000
    );

    console.log('Resposta da API Tiny:', tinyData.retorno.status);

    if (tinyData.retorno.status === 'Erro') {
      const erros = tinyData.retorno.erros?.map(e => e.erro).join(', ') || 'Erro desconhecido';
      console.error('Erro da API Tiny:', erros);
      throw new Error(`Erro da API Tiny: ${erros}`);
    }

    let allPedidos: TinyPedido[] = [];

    if (tinyData.retorno.pedidos && tinyData.retorno.pedidos.length > 0) {
      console.log(`Processando ${tinyData.retorno.pedidos.length} pedidos da primeira página`);
      
      // Processar pedidos da primeira página
      for (const item of tinyData.retorno.pedidos) {
        const pedido = item.pedido;
        
        try {
          const pedidoProcessado: TinyPedido = {
            id: pedido.id || '',
            numero: pedido.numero || '',
            numero_ecommerce: pedido.numero_ecommerce || null,
            nome_cliente: pedido.cliente?.nome || pedido.nome_cliente || 'Cliente não informado',
            cpf_cnpj: pedido.cliente?.cpf_cnpj || pedido.cpf_cnpj || null,
            data_pedido: convertDateFormat(pedido.data_pedido || ''), // ✅ Conversão correta
            data_prevista: convertDateFormat(pedido.data_prevista || ''), // ✅ Conversão correta
            valor_total: parseFloat(String(pedido.total_pedido || pedido.valor_total || '0').replace(',', '.')) || 0,
            valor_frete: parseFloat(String(pedido.valor_frete || '0').replace(',', '.')) || 0,
            valor_desconto: parseFloat(String(pedido.valor_desconto || '0').replace(',', '.')) || 0,
            situacao: (pedido.situacao || 'pendente').toLowerCase(),
            obs: pedido.obs || null,
            obs_interna: pedido.obs_interna || null,
            codigo_rastreamento: pedido.codigo_rastreamento || null,
            url_rastreamento: pedido.url_rastreamento || null,
            itens: pedido.itens || []
          };
          
          allPedidos.push(pedidoProcessado);
        } catch (itemError) {
          console.error('Erro ao processar pedido:', pedido.numero, itemError);
        }
      }

      // Salvar pedidos no banco (apenas os que conseguimos processar)
      let pedidosSalvos = 0;
      let itensSalvos = 0;

      for (const pedido of allPedidos) {
        try {
          const pedidoParaSalvar = {
            numero: pedido.numero,
            numero_ecommerce: pedido.numero_ecommerce,
            nome_cliente: pedido.nome_cliente,
            cpf_cnpj: pedido.cpf_cnpj,
            data_pedido: pedido.data_pedido,
            data_prevista: pedido.data_prevista,
            valor_total: pedido.valor_total,
            valor_frete: pedido.valor_frete,
            valor_desconto: pedido.valor_desconto,
            situacao: pedido.situacao,
            obs: pedido.obs,
            obs_interna: pedido.obs_interna,
            codigo_rastreamento: pedido.codigo_rastreamento,
            url_rastreamento: pedido.url_rastreamento
          };

          const { data: pedidoSalvo, error: errorPedido } = await supabaseClient
            .from('pedidos')
            .upsert(pedidoParaSalvar, { 
              onConflict: 'numero',
              ignoreDuplicates: false 
            })
            .select()
            .single();

          if (errorPedido) {
            console.error('Erro ao salvar pedido:', pedido.numero, errorPedido);
            continue;
          }

          pedidosSalvos++;

          // Salvar itens se existirem
          if (pedido.itens && pedido.itens.length > 0) {
            const itensParaInserir = pedido.itens.map((item: any) => ({
              pedido_id: pedidoSalvo.id,
              numero_pedido: pedido.numero,
              sku: item.item?.codigo || item.codigo || '',
              descricao: item.item?.descricao || item.descricao || '',
              quantidade: parseFloat(String(item.item?.quantidade || item.quantidade || '0').replace(',', '.')) || 0,
              valor_unitario: parseFloat(String(item.item?.valor_unitario || item.valor_unitario || '0').replace(',', '.')) || 0,
              valor_total: parseFloat(String(item.item?.valor_total || item.valor_total || '0').replace(',', '.')) || 0,
              ncm: item.item?.ncm || item.ncm,
              codigo_barras: item.item?.codigo_barras || item.codigo_barras,
              observacoes: item.item?.observacoes || item.observacoes
            }));

            const { error: errorItens } = await supabaseClient
              .from('itens_pedidos')
              .upsert(itensParaInserir, { 
                onConflict: 'numero_pedido,sku',
                ignoreDuplicates: false 
              });

            if (!errorItens) {
              itensSalvos += itensParaInserir.length;
            }
          }
        } catch (error) {
          console.error('Erro ao salvar pedido completo:', pedido.numero, error);
        }
      }

      console.log(`Salvos: ${pedidosSalvos} pedidos e ${itensSalvos} itens`);
    }

    const resultado = {
      pedidos: allPedidos,
      totalPedidos: allPedidos.length,
      pedidosSalvos: allPedidos.length,
      itensSalvos: allPedidos.reduce((acc, p) => acc + (p.itens?.length || 0), 0),
      paginas: parseInt(String(tinyData.retorno.numero_paginas || '1')),
      totalRegistros: parseInt(String(tinyData.retorno.total_registros || allPedidos.length)),
      message: allPedidos.length > 0 
        ? `${allPedidos.length} pedidos sincronizados com sucesso` 
        : 'Nenhum pedido encontrado para os filtros aplicados',
      tempoProcessamento: Date.now(),
      estrategia: 'primeira_pagina_otimizada'
    };

    // ✅ Salvar resultado no cache
    setCache(cacheKey, resultado);

    console.log('Sincronização concluída com sucesso');
    clearTimeout(functionTimeout);

    return new Response(JSON.stringify(resultado), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    clearTimeout(functionTimeout);
    console.error('Erro na sincronização:', error);
    
    let errorMessage = error.message;
    let errorCode = 'SYNC_ERROR';
    
    if (error.message === 'TIMEOUT') {
      errorMessage = 'Timeout: A busca demorou mais que 30 segundos. Tente filtros mais específicos.';
      errorCode = 'TIMEOUT';
    } else if (error.message.includes('API_BLOCKED')) {
      errorCode = 'API_BLOCKED';
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      message: 'Erro ao sincronizar pedidos com Tiny ERP',
      codigo: errorCode,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
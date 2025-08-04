import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS_PER_MINUTE = 15;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto

// Cache em memória para resultados recentes
const cacheMap = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MINUTES = 10;

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

// Função para fazer requisição com retry e backoff
async function makeApiCall(url: string, params: URLSearchParams, maxRetries = 3): Promise<any> {
  for (let tentativa = 1; tentativa <= maxRetries; tentativa++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
      });

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
      console.log(`Tentativa ${tentativa}/${maxRetries} falhou:`, error.message);
      
      if (error.message === 'API_BLOCKED') {
        throw new Error('API do Tiny ERP temporariamente bloqueada. Aguarde 2-3 minutos.');
      }
      
      if (tentativa === maxRetries) {
        throw error;
      }
      
      // Backoff exponencial
      await sleep(1000 * tentativa);
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting básico baseado no IP
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    
    if (!checkRateLimit(clientIP)) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit excedido. Aguarde um minuto.',
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
    const cacheKey = `pedidos-${filtros.dataInicio || 'hoje'}-${filtros.dataFim || 'hoje'}-${JSON.stringify(filtros.situacoes || [])}-completo`;
    
    // Verificar cache primeiro
    const cachedResult = getFromCache(cacheKey);
    if (cachedResult) {
      console.log('Retornando dados do cache');
      return new Response(JSON.stringify({
        ...cachedResult,
        fromCache: true,
        message: 'Dados retornados do cache (atualizados há menos de 10 minutos)'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Iniciando sincronização otimizada de pedidos');
    console.log('Filtros:', filtros);

    // ✅ ESTRATÉGIA 1: Busca inicial com com_itens=S (busca já com itens incluídos)
    const allPedidos: TinyPedido[] = [];
    let paginaAtual = 1;
    let totalPaginas = 1;
    let totalRegistros = 0;

    do {
      console.log(`Buscando página ${paginaAtual}/${totalPaginas}`);
      
      const params = new URLSearchParams({
        token: tinyToken,
        formato: 'JSON',
        pagina: paginaAtual.toString(),
        com_itens: 'S' // ✅ CRUCIAL: busca com itens já incluídos
      });

      // Aplicar filtros
      if (filtros.dataInicio) {
        params.append('dataInicio', filtros.dataInicio);
      }
      if (filtros.dataFim) {
        params.append('dataFim', filtros.dataFim);
      }
      if (filtros.situacao && filtros.situacao !== 'todas') {
        params.append('situacao', filtros.situacao);
      }

      const tinyData: TinyApiResponse = await makeApiCall(`${tinyApiUrl}/pedidos.pesquisa.php`, params);

      if (tinyData.retorno.status === 'Erro') {
        const erros = tinyData.retorno.erros?.map(e => e.erro).join(', ') || 'Erro desconhecido';
        throw new Error(`Erro da API Tiny: ${erros}`);
      }

      // Extrair informações de paginação
      totalPaginas = parseInt(String(tinyData.retorno.numero_paginas || '1'));
      totalRegistros = parseInt(String(tinyData.retorno.total_registros || '0'));

      if (tinyData.retorno.pedidos && tinyData.retorno.pedidos.length > 0) {
        // Processar pedidos da página atual
        for (const item of tinyData.retorno.pedidos) {
          const pedido = item.pedido;
          
          try {
            const pedidoProcessado: TinyPedido = {
              id: pedido.id || '',
              numero: pedido.numero || '',
              numero_ecommerce: pedido.numero_ecommerce || null,
              nome_cliente: pedido.cliente?.nome || pedido.nome_cliente || 'Cliente não informado',
              cpf_cnpj: pedido.cliente?.cpf_cnpj || pedido.cpf_cnpj || null,
              data_pedido: pedido.data_pedido || new Date().toISOString().split('T')[0],
              data_prevista: pedido.data_prevista || null,
              valor_total: parseFloat(String(pedido.total_pedido || pedido.valor_total || '0').replace(',', '.')) || 0,
              valor_frete: parseFloat(String(pedido.valor_frete || '0').replace(',', '.')) || 0,
              valor_desconto: parseFloat(String(pedido.valor_desconto || '0').replace(',', '.')) || 0,
              situacao: (pedido.situacao || 'pendente').toLowerCase(),
              obs: pedido.obs || null,
              obs_interna: pedido.obs_interna || null,
              codigo_rastreamento: pedido.codigo_rastreamento || null,
              url_rastreamento: pedido.url_rastreamento || null,
              itens: pedido.itens || [] // ✅ Itens já vêm incluídos
            };
            
            allPedidos.push(pedidoProcessado);
          } catch (itemError) {
            console.error('Erro ao processar pedido:', pedido.numero, itemError);
          }
        }
      }

      paginaAtual++;

      // ✅ DELAY entre páginas para não travar API
      if (paginaAtual <= totalPaginas) {
        await sleep(1000); // 1 segundo entre páginas
      }

    } while (paginaAtual <= totalPaginas);

    console.log(`Total de pedidos coletados: ${allPedidos.length}`);

    // ✅ ESTRATÉGIA 2: Busca detalhada OTIMIZADA - só para pedidos SEM itens
    const pedidosSemItens = allPedidos.filter(p => !p.itens || p.itens.length === 0);
    console.log(`Pedidos sem itens que precisam de busca detalhada: ${pedidosSemItens.length}`);

    if (pedidosSemItens.length > 0) {
      const BATCH_SIZE = 3; // Máximo 3 pedidos por vez

      for (let i = 0; i < pedidosSemItens.length; i += BATCH_SIZE) {
        const lote = pedidosSemItens.slice(i, i + BATCH_SIZE);
        console.log(`Processando lote ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(pedidosSemItens.length/BATCH_SIZE)}`);

        // Processa lote em PARALELO
        const promessasLote = lote.map(async (pedido) => {
          try {
            const params = new URLSearchParams({
              token: tinyToken,
              formato: 'JSON',
              id: pedido.numero,
              com_itens: 'S'
            });

            const detalheData = await makeApiCall(`${tinyApiUrl}/pedido.obter.php`, params);
            
            if (detalheData.retorno.status !== 'Erro') {
              const pedidoCompleto = detalheData.retorno.pedido;
              pedido.itens = pedidoCompleto.itens || [];
            } else {
              console.error(`Erro ao buscar detalhes do pedido ${pedido.numero}:`, detalheData.retorno.erros);
            }
          } catch (error) {
            console.error(`Erro ao buscar detalhes do pedido ${pedido.numero}:`, error);
          }
        });

        await Promise.all(promessasLote);

        // DELAY entre lotes
        if (i + BATCH_SIZE < pedidosSemItens.length) {
          await sleep(1000);
        }
      }
    }

    // Salvar todos os pedidos no banco de forma otimizada
    let pedidosSalvos = 0;
    let itensSalvos = 0;

    for (const pedido of allPedidos) {
      try {
        // Converter data para formato correto do PostgreSQL
        let dataFormatada = pedido.data_pedido;
        if (dataFormatada && dataFormatada.includes('/')) {
          const [dia, mes, ano] = dataFormatada.split('/');
          dataFormatada = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        }

        const pedidoParaSalvar = {
          numero: pedido.numero,
          numero_ecommerce: pedido.numero_ecommerce,
          nome_cliente: pedido.nome_cliente,
          cpf_cnpj: pedido.cpf_cnpj,
          data_pedido: dataFormatada,
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
          const itensParaInserir = pedido.itens.map(item => ({
            pedido_id: pedidoSalvo.id,
            numero_pedido: pedido.numero,
            sku: item.codigo || '',
            descricao: item.descricao || '',
            quantidade: item.quantidade || 0,
            valor_unitario: item.valor_unitario || 0,
            valor_total: item.valor_total || 0,
            ncm: item.ncm,
            codigo_barras: item.codigo_barras,
            observacoes: item.observacoes
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

    const resultado = {
      pedidos: allPedidos,
      totalPedidos: allPedidos.length,
      pedidosSalvos,
      itensSalvos,
      paginas: totalPaginas,
      totalRegistros,
      message: `${pedidosSalvos} pedidos e ${itensSalvos} itens sincronizados com sucesso`,
      tempoProcessamento: Date.now()
    };

    // ✅ Salvar resultado no cache
    setCache(cacheKey, resultado);

    console.log('Sincronização otimizada concluída com sucesso');

    return new Response(JSON.stringify(resultado), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na sincronização:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      message: 'Erro ao sincronizar pedidos com Tiny ERP',
      codigo: error.message.includes('API_BLOCKED') ? 'API_BLOCKED' : 'SYNC_ERROR'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configurações SUPER OTIMIZADAS para evitar timeout
const REQUEST_TIMEOUT = 10000; // 10 segundos
const MAX_RETRIES = 1; // Apenas 1 tentativa para ser rápido
const DELAY_RATE_LIMIT = 5000; // 5 segundos
const MAX_EXECUCAO_TEMPO = 25000; // 25 segundos total máximo

interface TinyPedido {
  id: string;
  numero: string;
  numero_ecommerce?: string;
  data_pedido: string;
  data_prevista?: string;
  nome_cliente: string;
  cpf_cnpj?: string;
  situacao: string;
  codigo_rastreamento?: string;
  url_rastreamento?: string;
  valor_frete: number;
  valor_desconto: number;
  valor_total: number;
  obs?: string;
  obs_interna?: string;
  itens?: any[];
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function convertDateFormat(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return dateStr;
}

async function makeQuickApiCall(url: string, params: URLSearchParams): Promise<any> {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout rápido')), REQUEST_TIMEOUT)
  );

  try {
    const response = await Promise.race([
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      }),
      timeoutPromise
    ]);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const jsonData = await response.json();
    
    // Rate limit? Aguardar pouco tempo
    if (jsonData.retorno?.status === 'Erro' && jsonData.retorno?.codigo_erro === 6) {
      console.log('Rate limit - aguardando 5s...');
      await sleep(DELAY_RATE_LIMIT);
      throw new Error('Rate limit - tente novamente');
    }
    
    if (jsonData.retorno?.status === 'Erro') {
      throw new Error(`API: ${jsonData.retorno.erro}`);
    }

    return jsonData;
  } catch (error) {
    console.error('Erro na API:', error.message);
    throw error;
  }
}

async function buscarConfiguracoes(supabase: any) {
  const { data: configs, error } = await supabase
    .from('configuracoes')
    .select('chave, valor')
    .in('chave', ['tiny_token', 'tiny_api_url']);

  if (error) throw new Error(`Erro config: ${error.message}`);

  const configMap = configs.reduce((acc, config) => {
    acc[config.chave] = config.valor;
    return acc;
  }, {});

  return {
    token: configMap.tiny_token,
    url: configMap.tiny_api_url
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🚀 Sync incremental iniciado');

    const config = await buscarConfiguracoes(supabase);
    
    if (!config.token || !config.url) {
      throw new Error('Configurações Tiny ERP não encontradas');
    }

    // Parse filtros
    let filtros: any = {};
    try {
      const body = await req.text();
      if (body) filtros = JSON.parse(body);
    } catch (e) {}

    // Parâmetros otimizados - APENAS 1 PÁGINA
    const params = new URLSearchParams({
      token: config.token,
      formato: 'json',
      com_itens: 'S',
      pagina: '1' // SEMPRE página 1 para ser rápido
    });

    if (filtros.filtros?.dataInicio) {
      params.append('dataInicial', filtros.filtros.dataInicio);
    }
    if (filtros.filtros?.dataFim) {
      params.append('dataFinal', filtros.filtros.dataFim);
    }

    console.log('📡 Buscando pedidos (máximo 1 página)...');
    
    // Verificar se ainda temos tempo
    if (Date.now() - startTime > MAX_EXECUCAO_TEMPO) {
      throw new Error('Timeout preventivo');
    }

    const jsonData = await makeQuickApiCall(
      `${config.url}/pedidos.pesquisa.php`,
      params
    );

    const pedidos = jsonData.retorno?.pedidos || [];
    const totalPaginas = parseInt(jsonData.retorno?.numero_paginas || '1');
    
    console.log(`📄 Encontrados ${pedidos.length} pedidos (página 1/${totalPaginas})`);

    const allPedidos: TinyPedido[] = [];
    const allItens: any[] = [];

    // Processar pedidos rapidamente
    for (const pedidoWrapper of pedidos) {
      const pedido = pedidoWrapper.pedido;
      
      const pedidoProcessado: TinyPedido = {
        id: pedido.id,
        numero: pedido.numero,
        numero_ecommerce: pedido.numero_ecommerce,
        data_pedido: convertDateFormat(pedido.data_pedido),
        data_prevista: pedido.data_prevista ? convertDateFormat(pedido.data_prevista) : null,
        nome_cliente: pedido.nome || pedido.cliente?.nome || 'Cliente não informado',
        cpf_cnpj: pedido.cpf_cnpj || pedido.cliente?.cpf_cnpj,
        situacao: pedido.situacao,
        codigo_rastreamento: pedido.codigo_rastreamento,
        url_rastreamento: pedido.url_rastreamento,
        valor_frete: parseFloat(pedido.valor_frete || '0'),
        valor_desconto: parseFloat(pedido.valor_desconto || '0'),
        valor_total: parseFloat(pedido.valor_total || '0'),
        obs: pedido.obs,
        obs_interna: pedido.obs_interna
      };

      allPedidos.push(pedidoProcessado);

      // Processar itens se existirem
      if (pedido.itens && Array.isArray(pedido.itens)) {
        for (const itemWrapper of pedido.itens) {
          const item = itemWrapper.item;
          
          allItens.push({
            numero_pedido: pedido.numero,
            sku: item.codigo,
            descricao: item.descricao,
            quantidade: parseInt(item.quantidade || '0'),
            valor_unitario: parseFloat(item.valor_unitario || '0'),
            valor_total: parseFloat(item.valor_total || '0'),
            ncm: item.ncm,
            observacoes: null
          });
        }
      }
    }

    // Salvar rapidamente no banco
    console.log('💾 Salvando no banco...');
    
    let pedidosSalvos = 0;
    let itensSalvos = 0;

    if (allPedidos.length > 0) {
      const { error: pedidosError } = await supabase
        .from('pedidos')
        .upsert(allPedidos, { onConflict: 'numero' });

      if (!pedidosError) {
        pedidosSalvos = allPedidos.length;
      }
    }

    if (allItens.length > 0) {
      const { error: itensError } = await supabase
        .from('itens_pedidos')
        .upsert(allItens, { onConflict: 'numero_pedido,sku' });

      if (!itensError) {
        itensSalvos = allItens.length;
      }
    }

    const tempoExecucao = Date.now() - startTime;
    
    console.log(`✅ Sync incremental concluído em ${tempoExecucao}ms`);

    return new Response(JSON.stringify({
      success: true,
      dados: {
        pedidos_encontrados: allPedidos.length,
        itens_encontrados: allItens.length,
        pedidos_salvos: pedidosSalvos,
        itens_salvos: itensSalvos,
        tempo_execucao_ms: tempoExecucao,
        total_paginas_disponiveis: totalPaginas
      },
      message: `Sync incremental: ${pedidosSalvos} pedidos e ${itensSalvos} itens (página 1/${totalPaginas})`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const tempoExecucao = Date.now() - startTime;
    console.error('💥 Erro no sync incremental:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      tempo_execucao_ms: tempoExecucao,
      message: 'Sync incremental falhou - dados locais disponíveis'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Status 200 para não quebrar o frontend
    });
  }
});
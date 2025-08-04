import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configurações otimizadas para PRODUÇÃO (evita timeouts)
const REQUEST_TIMEOUT = 15000; // 15 segundos
const BASE_RETRY_DELAY = 1000; // 1 segundo
const MAX_RETRIES = 2; // Reduzido para evitar timeouts
const DELAY_ENTRE_PAGINAS = 500; // 500ms entre páginas
const DELAY_ENTRE_LOTES = 1000; // 1 segundo entre lotes
const BATCH_SIZE = 1; // 1 pedido por vez para evitar sobrecarga
const MAX_PAGINAS_POR_EXECUCAO = 3; // CRÍTICO: máximo 3 páginas por execução
const DELAY_RATE_LIMIT = 10000; // 10 segundos em vez de 5 minutos

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
  itens?: TinyItemPedido[];
}

interface TinyItemPedido {
  codigo: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  ncm?: string;
  observacoes?: string;
}

interface ConfiguracaoTiny {
  tiny_erp_token: string;
  tiny_api_url: string;
  tiny_timeout_segundos: number;
  tiny_max_tentativas: number;
  tiny_delay_entre_requisicoes: number;
  tiny_max_falhas_consecutivas: number;
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

function determinarNomeEcommerce(pedido: any): string {
  const numeroEcommerce = pedido.numero_ecommerce || '';
  
  if (numeroEcommerce.startsWith('ML-')) return 'Mercado Livre';
  if (numeroEcommerce.startsWith('MSHOPS-')) return 'Mercado Shops';
  if (numeroEcommerce.startsWith('MKTPLACE-')) return 'Marketplace';
  if (numeroEcommerce.startsWith('AMAZON-')) return 'Amazon';
  if (numeroEcommerce.startsWith('SHOPEE-')) return 'Shopee';
  
  return numeroEcommerce ? 'Loja Virtual' : 'Balcão';
}

async function makeApiCallWithRetry(
  url: string, 
  params: URLSearchParams, 
  config: ConfiguracaoTiny,
  context: string
): Promise<any> {
  const maxTentativas = config.tiny_max_tentativas || MAX_RETRIES;
  const timeout = (config.tiny_timeout_segundos || 30) * 1000;
  
  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    try {
      console.log(`[${context}] Tentativa ${tentativa}/${maxTentativas}`);
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      );

      const response = await Promise.race([
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        }),
        timeoutPromise
      ]);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const jsonData = await response.json();
      
      // Verificar se há erro de rate limit - CRÍTICO: reduzir tempo
      if (jsonData.retorno?.status === 'Erro' && jsonData.retorno?.codigo_erro === 6) {
        console.log(`[${context}] Rate limit detectado. Aguardando ${DELAY_RATE_LIMIT/1000} segundos...`);
        await sleep(DELAY_RATE_LIMIT); // 10 segundos em vez de 5 minutos
        continue;
      }
      
      if (jsonData.retorno?.status === 'Erro') {
        throw new Error(`API Tiny: ${jsonData.retorno.erro}`);
      }

      console.log(`[${context}] Sucesso na tentativa ${tentativa}`);
      return jsonData;

    } catch (error) {
      console.error(`[${context}] Erro na tentativa ${tentativa}:`, error.message);
      
      if (tentativa === maxTentativas) {
        throw error;
      }

      // Backoff exponencial com jitter
      const delay = BASE_RETRY_DELAY * tentativa + (Math.random() * 1000);
      await sleep(delay);
    }
  }
}

async function buscarConfiguracoesTiny(supabase: any): Promise<ConfiguracaoTiny> {
  const { data: configs, error } = await supabase
    .from('configuracoes')
    .select('chave, valor')
    .in('chave', [
      'tiny_erp_token', 
      'tiny_api_url',
      'tiny_timeout_segundos',
      'tiny_max_tentativas', 
      'tiny_delay_entre_requisicoes',
      'tiny_max_falhas_consecutivas'
    ]);

  if (error) {
    throw new Error(`Erro ao buscar configurações: ${error.message}`);
  }

  const configMap = configs.reduce((acc, config) => {
    acc[config.chave] = config.valor;
    return acc;
  }, {});

  return {
    tiny_erp_token: configMap.tiny_erp_token,
    tiny_api_url: configMap.tiny_api_url,
    tiny_timeout_segundos: parseInt(configMap.tiny_timeout_segundos) || 30,
    tiny_max_tentativas: parseInt(configMap.tiny_max_tentativas) || 3,
    tiny_delay_entre_requisicoes: parseInt(configMap.tiny_delay_entre_requisicoes) || 2000,
    tiny_max_falhas_consecutivas: parseInt(configMap.tiny_max_falhas_consecutivas) || 3,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🚀 Iniciando sincronização robusta com Tiny ERP');
    const startTime = Date.now();

    // Buscar configurações do banco
    const config = await buscarConfiguracoesTiny(supabase);
    console.log('✅ Configurações carregadas');

    if (!config.tiny_erp_token || !config.tiny_api_url) {
      throw new Error('Token ou URL da API Tiny ERP não configurados');
    }

    // Parse request body para filtros opcionais
    let filtros: any = {};
    try {
      const body = await req.text();
      if (body) {
        filtros = JSON.parse(body);
      }
    } catch (e) {
      console.log('Sem filtros ou erro no parsing, usando padrão');
    }

    // Construir parâmetros da API
    const params = new URLSearchParams({
      token: config.tiny_erp_token,
      formato: 'json',
      com_itens: 'S', // FUNDAMENTAL para obter itens
      pagina: '1'
    });

    if (filtros.dataInicio) {
      params.append('dataInicial', filtros.dataInicio);
    }
    if (filtros.dataFim) {
      params.append('dataFinal', filtros.dataFim);
    }

    console.log('📡 Buscando pedidos na API Tiny ERP...');
    
    const allPedidos: TinyPedido[] = [];
    const allItens: any[] = [];
    let paginaAtual = 1;
    let totalPaginas = 1;
    let tentativasConsecutivasFalha = 0;

    // Sincronização paginada robusta - LIMITADA para evitar timeout
    do {
      try {
        // CRÍTICO: Parar se exceder o limite de páginas por execução
        if (paginaAtual > MAX_PAGINAS_POR_EXECUCAO) {
          console.log(`⏰ Limite de ${MAX_PAGINAS_POR_EXECUCAO} páginas atingido. Parando para evitar timeout.`);
          break;
        }

        params.set('pagina', paginaAtual.toString());
        
        const jsonData = await makeApiCallWithRetry(
          `${config.tiny_api_url}/pedidos.pesquisa.php`,
          params,
          config,
          `Página ${paginaAtual}`
        );

        totalPaginas = parseInt(jsonData.retorno?.numero_paginas || '1');
        const pedidos = jsonData.retorno?.pedidos || [];

        console.log(`📄 Página ${paginaAtual}/${totalPaginas}: ${pedidos.length} pedidos`);

        // Processar pedidos da página
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
              
              const itemProcessado = {
                numero_pedido: pedido.numero,
                sku: item.codigo,
                descricao: item.descricao,
                quantidade: parseInt(item.quantidade || '0'),
                valor_unitario: parseFloat(item.valor_unitario || '0'),
                valor_total: parseFloat(item.valor_total || '0'),
                ncm: item.ncm,
                observacoes: null
              };

              allItens.push(itemProcessado);
            }
          }
        }

        paginaAtual++;
        tentativasConsecutivasFalha = 0;

        // Delay entre páginas
        if (paginaAtual <= totalPaginas) {
          await sleep(config.tiny_delay_entre_requisicoes || DELAY_ENTRE_PAGINAS);
        }

      } catch (error) {
        console.error(`❌ Erro na página ${paginaAtual}:`, error.message);
        tentativasConsecutivasFalha++;
        
        if (tentativasConsecutivasFalha >= config.tiny_max_falhas_consecutivas) {
          console.log(`🛑 Máximo de falhas consecutivas atingido. Parando na página ${paginaAtual}`);
          break;
        }

        await sleep(BASE_RETRY_DELAY * tentativasConsecutivasFalha);
      }
    } while (paginaAtual <= totalPaginas);

    console.log(`📊 Processamento concluído: ${allPedidos.length} pedidos, ${allItens.length} itens`);

    // Buscar detalhes para pedidos sem itens (em lotes pequenos)
    const pedidosSemItens = allPedidos.filter(p => 
      !allItens.some(item => item.numero_pedido === p.numero)
    );

    if (pedidosSemItens.length > 0) {
      console.log(`🔍 Buscando detalhes para ${pedidosSemItens.length} pedidos sem itens...`);

      for (let i = 0; i < pedidosSemItens.length; i += BATCH_SIZE) {
        const lote = pedidosSemItens.slice(i, i + BATCH_SIZE);
        
        console.log(`📦 Processando lote ${Math.floor(i/BATCH_SIZE) + 1}: ${lote.length} pedidos`);

        const promessasLote = lote.map(async (pedido) => {
          try {
            const detalhesParams = new URLSearchParams({
              token: config.tiny_erp_token,
              formato: 'json',
              id: pedido.id
            });

            const detalhesData = await makeApiCallWithRetry(
              `${config.tiny_api_url}/pedido.obter.php?${detalhesParams.toString()}`,
              new URLSearchParams(),
              config,
              `Detalhes-${pedido.numero}`
            );

            const pedidoDetalhado = detalhesData.retorno?.pedido;
            if (pedidoDetalhado?.itens) {
              for (const itemWrapper of pedidoDetalhado.itens) {
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
          } catch (error) {
            console.error(`❌ Erro ao buscar detalhes do pedido ${pedido.numero}:`, error.message);
          }
        });

        await Promise.all(promessasLote);
        await sleep(DELAY_ENTRE_LOTES);
      }
    }

    // Salvar dados no Supabase
    console.log('💾 Salvando dados no Supabase...');

    let pedidosSalvos = 0;
    let itensSalvos = 0;

    if (allPedidos.length > 0) {
      const { error: pedidosError } = await supabase
        .from('pedidos')
        .upsert(allPedidos, { 
          onConflict: 'numero',
          ignoreDuplicates: false 
        });

      if (pedidosError) {
        throw new Error(`Erro ao salvar pedidos: ${pedidosError.message}`);
      }
      pedidosSalvos = allPedidos.length;
    }

    if (allItens.length > 0) {
      const { error: itensError } = await supabase
        .from('itens_pedidos')
        .upsert(allItens, { 
          onConflict: 'numero_pedido,sku',
          ignoreDuplicates: false 
        });

      if (itensError) {
        throw new Error(`Erro ao salvar itens: ${itensError.message}`);
      }
      itensSalvos = allItens.length;
    }

    const tempoExecucao = Date.now() - startTime;
    
    console.log(`✅ Sincronização concluída em ${tempoExecucao}ms`);

    return new Response(JSON.stringify({
      success: true,
      dados: {
        pedidos_encontrados: allPedidos.length,
        itens_encontrados: allItens.length,
        pedidos_salvos: pedidosSalvos,
        itens_salvos: itensSalvos,
        tempo_execucao_ms: tempoExecucao,
        paginas_processadas: paginaAtual - 1,
        total_paginas: totalPaginas
      },
      message: `Sincronização concluída: ${pedidosSalvos} pedidos e ${itensSalvos} itens processados`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('💥 Erro na sincronização:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      message: 'Erro durante a sincronização com Tiny ERP'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
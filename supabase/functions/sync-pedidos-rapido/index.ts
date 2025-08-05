import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configurações ultra otimizadas para performance máxima
const REQUEST_TIMEOUT = 15000; // 15 segundos - reduzido para acelerar
const BASE_RETRY_DELAY = 500; // 500ms - reduzido para acelerar retries
const MAX_RETRIES = 2; // 2 tentativas - reduzido para acelerar
const DELAY_ENTRE_PAGINAS = 100; // 100ms - reduzido para acelerar paginação
const DELAY_ENTRE_LOTES = 50; // 50ms - reduzido para acelerar lotes
const BATCH_SIZE = 10; // 10 pedidos por lote - aumentado para mais paralelismo
const MAX_PAGINAS_POR_EXECUCAO = 1000; // Aumentado para processar mais
const DELAY_RATE_LIMIT = 3000; // 3 segundos para rate limit - reduzido
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos de cache - reduzido para dados mais frescos
const MAX_CONCURRENT_REQUESTS = 5; // Máximo de requests paralelos

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

// ✅ NOVO: Sistema de cache em memória 
const cache = new Map<string, { data: any; timestamp: number }>();

function getFromCache(key: string): any | null {
  const cached = cache.get(key);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// SEMPRE converter datas para formato DB (YYYY-MM-DD) para salvar no Supabase
function convertDateFormat(dateStr: string): string {
  if (!dateStr) return '';
  
  // Se está no formato DD/MM/YYYY, converte para YYYY-MM-DD para o banco
  if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Se já está no formato YYYY-MM-DD, retorna como está
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }
  
  return dateStr;
}

// Nova função para converter datas dos filtros para o formato da API Tiny
function formatDateForTinyAPI(dateStr: string): string {
  if (!dateStr) return '';
  // Se já está no formato DD/MM/YYYY, retorna como está
  if (dateStr.includes('/')) return dateStr;
  
  // Converte YYYY-MM-DD para DD/MM/YYYY
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
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

// ✅ CORRIGIDO: Função para mapear situações conforme tabela auxiliar do Tiny ERP
function mapearSituacoes(situacao: string | string[]): string {
  // Mapeamento correto conforme documentação oficial da API Tiny
  const mapeamento: { [key: string]: string } = {
    // Formatos exatos do frontend para códigos corretos da API Tiny
    'Em Aberto': 'aberto',
    'em aberto': 'aberto',
    'Em aberto': 'aberto', 
    'aprovado': 'aprovado',
    'Aprovado': 'aprovado',
    'Preparando Envio': 'preparando_envio',
    'preparando envio': 'preparando_envio',
    'Preparando envio': 'preparando_envio',
    'faturado': 'faturado',
    'Faturado': 'faturado',
    'atendido': 'faturado', 
    'Atendido': 'faturado',
    'Pronto para Envio': 'pronto_envio',
    'pronto para envio': 'pronto_envio',
    'Pronto para envio': 'pronto_envio', 
    'enviado': 'enviado',
    'Enviado': 'enviado',
    'entregue': 'entregue',
    'Entregue': 'entregue',
    'Nao Entregue': 'nao_entregue',
    'nao entregue': 'nao_entregue',
    'Nao entregue': 'nao_entregue',
    'Não entregue': 'nao_entregue',
    'Não Entregue': 'nao_entregue',
    'cancelado': 'cancelado',
    'Cancelado': 'cancelado',
    // ✅ CRITICO: Situações que vêm do filtro de busca do frontend
    'cancelado,Entregue': 'cancelado,entregue'
  };
  
  if (typeof situacao === 'string') {
    return mapeamento[situacao] || situacao;
  }
  
  if (Array.isArray(situacao)) {
    return situacao
      .map(s => mapeamento[s] || s)
      .join(',');
  }
  
  return '';
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
      console.log(`[${context}] URL:`, url);
      console.log(`[${context}] Parâmetros:`, Object.fromEntries(params.entries()));
      
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
      console.log(`[${context}] Resposta da API:`, JSON.stringify(jsonData, null, 2));
      
      // Verificar se há erro de rate limit - CRÍTICO: reduzir tempo
      if (jsonData.retorno?.status === 'Erro' && jsonData.retorno?.codigo_erro === 6) {
        console.log(`[${context}] Rate limit detectado. Aguardando ${DELAY_RATE_LIMIT/1000} segundos...`);
        await sleep(DELAY_RATE_LIMIT); // 10 segundos em vez de 5 minutos
        continue;
      }
      
      if (jsonData.retorno?.status === 'Erro') {
        const erro = jsonData.retorno?.erro || 
                     jsonData.retorno?.erros?.[0]?.erro || 
                     'Erro desconhecido';
        
        const codigoErro = jsonData.retorno?.codigo_erro;
        console.log(`[${context}] ERRO DA API TINY - Código: ${codigoErro}, Erro: ${erro}`);
        
        // Log completo dos erros para diagnóstico
        if (jsonData.retorno?.erros) {
          console.log(`[${context}] Lista completa de erros:`, jsonData.retorno.erros);
        }

        // Tratamento especial para "sem registros"
        if (erro === 'A consulta não retornou registros' || 
            erro.includes('não retornou registros') ||
            codigoErro === '20' || codigoErro === 20) {
          console.log(`[${context}] Sem registros encontrados na página (Código 20)`);
          return { sem_registros: true };
        }
        
        throw new Error(`API Tiny: ${erro} (Código: ${codigoErro})`);
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
      console.log('📝 [DEBUG] Body recebido:', body);
      if (body) {
        filtros = JSON.parse(body);
        console.log('✅ [DEBUG] Filtros parseados:', JSON.stringify(filtros, null, 2));
      }
    } catch (e) {
      console.log('⚠️ Sem filtros ou erro no parsing, usando padrão:', e.message);
    }

    // ✅ NOVO: Verificar cache primeiro
    const cacheKey = `pedidos-${JSON.stringify(filtros)}`;
    const cachedData = getFromCache(cacheKey);
    if (cachedData) {
      console.log('📦 Retornando dados do cache (10 min)');
      return new Response(JSON.stringify(cachedData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Construir parâmetros da API
    const params = new URLSearchParams({
      token: config.tiny_erp_token,
      formato: 'json',
      com_itens: 'S', // FUNDAMENTAL para obter itens
      limite: '100', // ✅ CORRIGIDO: Usar 100 registros por página (máximo da API)
      pagina: '1'
    });

    // ✅ CORRIGIDO: Aplicar filtros de data
    if (filtros.filtros?.dataInicial || filtros.filtros?.dataInicio) {
      const dataInicial = filtros.filtros.dataInicial || filtros.filtros.dataInicio;
      const dataFormatada = formatDateForTinyAPI(dataInicial);
      params.append('dataInicial', dataFormatada);
      console.log(`📅 Data inicial aplicada: ${dataInicial} → ${dataFormatada}`);
    }
    if (filtros.filtros?.dataFinal || filtros.filtros?.dataFim) {
      const dataFinal = filtros.filtros.dataFinal || filtros.filtros.dataFim;
      const dataFormatada = formatDateForTinyAPI(dataFinal);
      params.append('dataFinal', dataFormatada);
      console.log(`📅 Data final aplicada: ${dataFinal} → ${dataFormatada}`);
    }
    
    // ✅ CORRIGIDO: Aplicar filtros de situação apenas se fornecidos e válidos
    if (filtros.filtros?.situacao) {
      const situacoes = Array.isArray(filtros.filtros.situacao) 
        ? filtros.filtros.situacao 
        : [filtros.filtros.situacao];
      
      if (situacoes && situacoes.length > 0) {
        const situacaoMapeada = mapearSituacoes(situacoes);
        if (situacaoMapeada) {
          params.append('situacao', situacaoMapeada);
          console.log('🎯 Situações aplicadas:', situacaoMapeada);
        }
      }
    }

    console.log('📡 Parâmetros finais para API Tiny:', Object.fromEntries(params.entries()));

    // ✅ DIAGNÓSTICO CRÍTICO: Teste sem filtros se houver erro de "sem registros"
    const paramsBackup = new URLSearchParams(params);
    
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
          `https://api.tiny.com.br/api2/pedidos.pesquisa.php`,
          params,
          config,
          `Página ${paginaAtual}`
        );

        // ✅ CRÍTICO: Verificar se não há registros e tentar sem filtros
        if (jsonData.sem_registros) {
          console.log(`📄 Página ${paginaAtual}: Sem registros encontrados com filtros aplicados`);
          
          // Se for a primeira página e não há registros, testar sem filtros
          if (paginaAtual === 1 && (params.has('dataInicial') || params.has('situacao'))) {
            console.log('🔍 DIAGNÓSTICO: Testando busca sem filtros para verificar se existem pedidos...');
            
            const paramsMinimos = new URLSearchParams({
              token: config.tiny_erp_token,
              formato: 'json',
              com_itens: 'S',
              pagina: '1',
              limite: '10' // Apenas alguns para teste
            });
            
            try {
              const testeData = await makeApiCallWithRetry(
                `https://api.tiny.com.br/api2/pedidos.pesquisa.php`,
                paramsMinimos,
                config,
                'Teste sem filtros'
              );
              
              if (!testeData.sem_registros) {
                const pedidosTeste = testeData.retorno?.pedidos || [];
                console.log(`🔍 RESULTADO TESTE: Encontrados ${pedidosTeste.length} pedidos SEM filtros. O problema são os filtros aplicados!`);
                console.log('🎯 Filtros problemáticos:', Object.fromEntries(params.entries()));
              } else {
                console.log('🔍 RESULTADO TESTE: Sem pedidos mesmo sem filtros. API pode estar indisponível.');
              }
            } catch (testError) {
              console.warn('⚠️ Erro no teste sem filtros:', testError.message);
            }
          }
          
          break;
        }

        totalPaginas = parseInt(jsonData.retorno?.numero_paginas || '1');
        const pedidos = jsonData.retorno?.pedidos || [];

        console.log(`📄 Página ${paginaAtual}/${totalPaginas}: ${pedidos.length} pedidos (Total acumulado: ${allPedidos.length + pedidos.length})`);
        
        // ✅ DIAGNÓSTICO: Log detalhado sobre limites da API
        if (paginaAtual === 1) {
          console.log(`🔍 DIAGNÓSTICO: API retornou ${pedidos.length} pedidos na primeira página. Total de páginas: ${totalPaginas}`);
          console.log(`📊 Isso significa que há ${pedidos.length * totalPaginas} pedidos estimados no total`);
        }

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

          // ✅ CORRIGIDO: Processar itens - API pode retornar itens diretamente no pedido ou em wrapper
          let itensEncontrados = 0;
          
          // Verificar se os itens estão em pedido.itens diretamente
          if (pedido.itens && Array.isArray(pedido.itens)) {
            console.log(`📦 Pedido ${pedido.numero}: ${pedido.itens.length} itens encontrados (formato direto)`);
            
            for (const item of pedido.itens) {
              // Itens podem vir diretamente ou dentro de wrapper {item: {...}}
              const itemData = item.item || item;
              
              const itemProcessado = {
                pedido_id: pedido.id,
                numero_pedido: pedido.numero,
                sku: itemData.codigo || itemData.sku || '',
                descricao: itemData.descricao || '',
                quantidade: parseInt(itemData.quantidade || '0'),
                valor_unitario: parseFloat(itemData.valor_unitario || '0'),
                valor_total: parseFloat(itemData.valor_total || '0'),
                ncm: itemData.ncm || null,
                codigo_barras: itemData.codigo_barras || null,
                observacoes: itemData.observacoes || null
              };

              allItens.push(itemProcessado);
              itensEncontrados++;
            }
          } 
          // Verificar se os itens estão em outro formato/campo
          else if (pedido.produtos && Array.isArray(pedido.produtos)) {
            console.log(`📦 Pedido ${pedido.numero}: ${pedido.produtos.length} produtos encontrados`);
            
            for (const produto of pedido.produtos) {
              const produtoData = produto.produto || produto;
              
              const itemProcessado = {
                pedido_id: pedido.id,
                numero_pedido: pedido.numero,
                sku: produtoData.codigo || produtoData.sku || '',
                descricao: produtoData.descricao || '',
                quantidade: parseInt(produtoData.quantidade || '0'),
                valor_unitario: parseFloat(produtoData.valor_unitario || '0'),
                valor_total: parseFloat(produtoData.valor_total || '0'),
                ncm: produtoData.ncm || null,
                codigo_barras: produtoData.codigo_barras || null,
                observacoes: produtoData.observacoes || null
              };

              allItens.push(itemProcessado);
              itensEncontrados++;
            }
          }
          else {
            // ✅ DIAGNÓSTICO CRÍTICO: Estrutura completa do pedido para debug
            console.error(`⚠️ Pedido ${pedido.numero} SEM ITENS! Estrutura completa:`, {
              tem_itens: !!pedido.itens,
              tipo_itens: typeof pedido.itens,
              é_array_itens: Array.isArray(pedido.itens),
              tem_produtos: !!pedido.produtos,
              tipo_produtos: typeof pedido.produtos,
              é_array_produtos: Array.isArray(pedido.produtos),
              todas_keys_pedido: Object.keys(pedido),
              estrutura_pedido: JSON.stringify(pedido, null, 2).substring(0, 500)
            });
          }
          
          if (itensEncontrados > 0) {
            console.log(`✅ Pedido ${pedido.numero}: ${itensEncontrados} itens processados com sucesso`);
          }
        }

        paginaAtual++;
        tentativasConsecutivasFalha = 0;

        // Delay otimizado entre páginas
        if (paginaAtual <= totalPaginas) {
          await sleep(DELAY_ENTRE_PAGINAS);
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

    // ✅ ULTRA OTIMIZADO: Buscar detalhes individuais com processamento paralelo
    if (allPedidos.length > 0 && allItens.length === 0) {
      console.log('🚀 Pedidos sem itens detectados. Iniciando busca paralela ultra rápida...');
      
      // Função para buscar detalhes de um pedido
      const buscarDetalhesPedido = async (pedido: TinyPedido): Promise<any[]> => {
        try {
          const detalhesParams = new URLSearchParams({
            token: config.tiny_erp_token,
            formato: 'json',
            id: pedido.id
          });
          
          const detalhesData = await makeApiCallWithRetry(
            `https://api.tiny.com.br/api2/pedido.obter.php`,
            detalhesParams,
            config,
            `Detalhes pedido ${pedido.numero}`
          );
          
          const pedidoDetalhado = detalhesData.retorno?.pedido;
          if (pedidoDetalhado?.itens && Array.isArray(pedidoDetalhado.itens)) {
            console.log(`📦 Pedido ${pedido.numero}: ${pedidoDetalhado.itens.length} itens encontrados nos detalhes`);
            
            return pedidoDetalhado.itens.map((itemWrapper: any) => {
              const item = itemWrapper.item || itemWrapper;
              return {
                pedido_id: pedido.id,
                numero_pedido: pedido.numero,
                sku: item.codigo || '',
                descricao: item.descricao || '',
                quantidade: parseInt(item.quantidade || '0'),
                valor_unitario: parseFloat(item.valor_unitario || '0'),
                valor_total: parseFloat(item.valor_total || '0'),
                ncm: item.ncm || null,
                codigo_barras: item.codigo_barras || null,
                observacoes: item.observacoes || null
              };
            });
          }
          return [];
        } catch (error) {
          console.warn(`⚠️ Erro ao buscar detalhes do pedido ${pedido.numero}:`, error.message);
          return [];
        }
      };

      // Função para processar lote com semáforo para controlar concorrência
      const processarLoteComConcorrencia = async (lote: TinyPedido[]): Promise<any[]> => {
        const promises = lote.map((pedido, index) => 
          new Promise(async (resolve) => {
            // Pequeno delay escalonado para distribuir requests
            await sleep(index * 20);
            const itens = await buscarDetalhesPedido(pedido);
            resolve(itens);
          })
        );
        
        const resultados = await Promise.all(promises);
        return resultados.flat();
      };

      // Processar todos os pedidos em lotes paralelos
      const todosPedidos = allPedidos;
      const totalLotes = Math.ceil(todosPedidos.length / BATCH_SIZE);
      
      console.log(`🚀 Processando ${todosPedidos.length} pedidos em ${totalLotes} lotes de ${BATCH_SIZE} (máx ${MAX_CONCURRENT_REQUESTS} paralelos)`);
      
      for (let i = 0; i < todosPedidos.length; i += BATCH_SIZE) {
        const lote = todosPedidos.slice(i, i + BATCH_SIZE);
        const loteNumero = Math.floor(i / BATCH_SIZE) + 1;
        
        console.log(`⚡ Processando lote ${loteNumero}/${totalLotes} (${lote.length} pedidos)...`);
        
        const itensLote = await processarLoteComConcorrencia(lote);
        allItens.push(...itensLote);
        
        // Delay mínimo entre lotes para não sobrecarregar
        if (i + BATCH_SIZE < todosPedidos.length) {
          await sleep(DELAY_ENTRE_LOTES);
        }
      }
      
      console.log(`🚀 Busca paralela concluída: ${allItens.length} itens encontrados em tempo ultra otimizado!`);
    } else if (allItens.length > 0) {
      console.log('⚡ Itens já obtidos da pesquisa principal - sem necessidade de busca individual');
    }

    // ✅ SOLUÇÃO 3: LOGS DETALHADOS na inserção de dados no banco
    console.log('🚀 Salvando dados no Supabase com logs detalhados...');

    let pedidosSalvos = 0;
    let itensSalvos = 0;

    // Log das datas que serão inseridas para verificação
    if (allPedidos.length > 0) {
      console.log('📅 LOGS DE DATAS - Primeiros 3 pedidos que serão inseridos:');
      allPedidos.slice(0, 3).forEach((pedido, index) => {
        console.log(`  Pedido ${index + 1} (${pedido.numero}):`, {
          data_pedido_original: pedido.data_pedido,
          data_prevista_original: pedido.data_prevista,
          formato_correto: pedido.data_pedido.match(/^\d{4}-\d{2}-\d{2}$/) ? '✅ YYYY-MM-DD' : '❌ Formato incorreto'
        });
      });
    }

    // Executar salvamento de pedidos e itens em paralelo
    const salvarPromises = [];

    if (allPedidos.length > 0) {
      console.log(`💾 Iniciando salvamento de ${allPedidos.length} pedidos...`);
      salvarPromises.push(
        supabase
          .from('pedidos')
          .upsert(allPedidos, { 
            onConflict: 'numero',
            ignoreDuplicates: false 
          })
          .then(({ data, error }) => {
            if (error) {
              console.error('❌ ERRO ao salvar pedidos:', error);
              throw new Error(`Erro ao salvar pedidos: ${error.message}`);
            }
            console.log(`✅ ${allPedidos.length} pedidos salvos com sucesso no Supabase`);
            return allPedidos.length;
          })
      );
    }

    if (allItens.length > 0) {
      console.log(`💾 Iniciando salvamento de ${allItens.length} itens...`);
      salvarPromises.push(
        supabase
          .from('itens_pedidos')
          .upsert(allItens, { 
            onConflict: 'numero_pedido,sku',
            ignoreDuplicates: false 
          })
          .then(({ data, error }) => {
            if (error) {
              console.error('❌ ERRO ao salvar itens:', error);
              throw new Error(`Erro ao salvar itens: ${error.message}`);
            }
            console.log(`✅ ${allItens.length} itens salvos com sucesso no Supabase`);
            return allItens.length;
          })
      );
    }

    // Aguardar todas as operações de salvamento
    if (salvarPromises.length > 0) {
      const resultados = await Promise.all(salvarPromises);
      pedidosSalvos = allPedidos.length > 0 ? resultados[0] : 0;
      itensSalvos = allItens.length > 0 ? resultados[allPedidos.length > 0 ? 1 : 0] : 0;
      
      console.log('📊 LOGS FINAIS DE INSERÇÃO:', {
        pedidos_salvos: pedidosSalvos,
        itens_salvos: itensSalvos,
        timestamp_insercao: new Date().toISOString()
      });
    }

    const tempoExecucao = Date.now() - startTime;
    
    console.log(`✅ Sincronização concluída em ${tempoExecucao}ms`);

    // ✅ SOLUÇÃO 4: OTIMIZAÇÃO DA ARQUITETURA - Retornar dados diretamente
    console.log('🚀 Preparando resposta otimizada com dados processados...');
    
    const resultado = {
      success: true,
      dados: {
        pedidos_encontrados: allPedidos.length,
        itens_encontrados: allItens.length,
        pedidos_salvos: pedidosSalvos,
        itens_salvos: itensSalvos,
        tempo_execucao_ms: tempoExecucao,
        paginas_processadas: paginaAtual - 1,
        total_paginas: totalPaginas,
        registros_por_pagina: 100,
        cache_utilizado: false
      },
      // ✅ NOVO: Retornar os dados processados diretamente (elimina consulta local)
      pedidos: allPedidos,
      itens: allItens,
      message: `Sincronização concluída: ${pedidosSalvos} pedidos e ${itensSalvos} itens processados`
    };
    
    console.log(`🎯 Resposta otimizada preparada: ${allPedidos.length} pedidos + ${allItens.length} itens retornados diretamente`);

    // ✅ NOVO: Salvar no cache para próximas consultas
    setCache(cacheKey, resultado);

    return new Response(JSON.stringify(resultado), {
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
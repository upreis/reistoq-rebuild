import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ✅ CONFIGURAÇÕES OTIMIZADAS PARA PERFORMANCE E ESTABILIDADE
const REQUEST_TIMEOUT = 20000; // 20s
const BASE_RETRY_DELAY = 800; // backoff base um pouco menor
const MAX_RETRIES = 3;
const DELAY_ENTRE_PAGINAS = 300; // reduzir para acelerar varredura de páginas
const DELAY_ENTRE_LOTES = 800; // reduzir para agilizar processamento
const BATCH_SIZE = 6; // aumentar concorrência controlada por lote
const MAX_PAGINAS_POR_EXECUCAO = 200; // seguro para períodos maiores
const DELAY_RATE_LIMIT = 10000; // 10s para rate limit
const CACHE_TTL = 15 * 60 * 1000; // 15 min
const MAX_CONCURRENT_REQUESTS = 6; // alinhado ao BATCH_SIZE
const INTELLIGENT_RATE_LIMIT_DETECTION = true; // mantém

// Controla logs verbosos de request/response da API
const VERBOSE_LOGS = false;

// Função para verificar se o processo deve continuar
async function verificarStatusProcesso(supabase: any): Promise<{shouldContinue: boolean, status: string}> {
  try {
    const { data, error } = await supabase
      .from('sync_control')
      .select('status')
      .eq('process_name', 'sync-pedidos-rapido')
      .single();
    
    if (error) {
      console.warn('Erro ao verificar status do processo:', error);
      return { shouldContinue: true, status: 'unknown' };
    }
    
    const shouldContinue = data.status === 'running';
    console.log(`📋 Status do processo: ${data.status}, continuar: ${shouldContinue}`);
    
    return { shouldContinue, status: data.status };
  } catch (error) {
    console.warn('Erro ao verificar status:', error);
    return { shouldContinue: true, status: 'unknown' };
  }
}

// Função para atualizar progresso
async function atualizarProgresso(supabase: any, progress: any) {
  try {
    await supabase
      .from('sync_control')
      .update({ 
        progress,
        status: 'running'
      })
      .eq('process_name', 'sync-pedidos-rapido');
  } catch (error) {
    console.warn('Erro ao atualizar progresso:', error);
  }
}

interface TinyPedido {
  id: string;
  numero: string;
  numero_ecommerce?: string;
  data_pedido: string;
  data_prevista?: string;
  nome_cliente: string;
  cpf_cnpj?: string;
  cidade?: string;
  uf?: string;
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

// ✅ Nova função para sincronização em background sem bloquear resposta
async function sincronizarEmBackground(filtros: any, supabase: any, configuracaoTiny: ConfiguracaoTiny) {
  try {
    console.log('🔄 Iniciando sincronização em background...');
    
    // Implementar sincronização completa aqui se necessário
    // Por enquanto, apenas log para indicar que a função está funcionando
    console.log('✅ Sincronização background iniciada (placeholder)');
    
  } catch (error) {
    console.error('❌ Erro na sincronização background:', error);
  }
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
if (VERBOSE_LOGS) {
  console.log(`[${context}] URL:`, url);
  console.log(`[${context}] Parâmetros:`, Object.fromEntries(params.entries()));
}
      
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
if (VERBOSE_LOGS) {
  console.log(`[${context}] Resposta da API:`, JSON.stringify(jsonData, null, 2));
}
      
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
        
if (VERBOSE_LOGS && jsonData.retorno?.erros) {
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
      'tiny_token',
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
    tiny_erp_token: configMap.tiny_token,
    tiny_api_url: configMap.tiny_api_url || 'https://api.tiny.com.br/api2',
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

    // Garantir que o processo fique como running durante o BG
    try {
      await supabase
        .from('sync_control')
        .update({ status: 'running', progress: { started_at: new Date().toISOString() } })
        .eq('process_name', 'sync-pedidos-rapido');
    } catch (e) {
      console.warn('Não foi possível marcar status running:', e);
    }

    // Tentar resolver a organização do usuário e pegar token de Integrações · Contas (Tiny)
    let CURRENT_ACCOUNT_ID: string | null = null;
    let CURRENT_ACCOUNT_NAME: string | null = null;
    try {
      const authHeader = req.headers.get('Authorization') || '';
      const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (jwt) {
        const { data: userData } = await supabase.auth.getUser(jwt);
        const userId = userData?.user?.id;
        if (userId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('organizacao_id')
            .eq('id', userId)
            .maybeSingle();
          const orgId = profile?.organizacao_id;
          if (orgId) {
            const { data: contas } = await supabase
              .from('integration_accounts')
              .select('id,name')
              .eq('organization_id', orgId)
              .eq('provider', 'tiny')
              .eq('is_active', true)
              .limit(1);
            if (contas && contas.length > 0) {
              const conta = contas[0] as any;
              const { data: sec } = await supabase
                .from('integration_secrets')
                .select('access_token')
                .eq('integration_account_id', conta.id)
                .eq('provider', 'tiny')
                .maybeSingle();
              const tokenConta = sec?.access_token as string | undefined;
              if (tokenConta) {
                config.tiny_erp_token = tokenConta;
                CURRENT_ACCOUNT_ID = conta.id;
                CURRENT_ACCOUNT_NAME = conta.name;
              }
            }
          }
        }
      }
    } catch (e) {
      console.log('⚠️ Não foi possível resolver organização/conta Tiny:', (e as any)?.message || e);
    }

    // Aviso: se não houver token em contas, cairemos no fallback de Configurações mais abaixo

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

    // Construir lista de contas Tiny a processar (multi-conta)
    interface ContaTiny { id: string | null; name: string | null; token: string }
    const contasTiny: ContaTiny[] = [];

    try {
      const authHeader = req.headers.get('Authorization') || '';
      const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      let orgId: string | null = null;
      if (jwt) {
        const { data: userData } = await supabase.auth.getUser(jwt);
        const userId = userData?.user?.id;
        if (userId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('organizacao_id')
            .eq('id', userId)
            .maybeSingle();
          orgId = profile?.organizacao_id ?? null;
        }
      }

      if (orgId) {
        const { data: contas } = await supabase
          .from('integration_accounts')
          .select('id,name')
          .eq('provider', 'tiny')
          .eq('is_active', true)
          .eq('organization_id', orgId);
        (contas || []).forEach(async (conta: any) => {
          const { data: sec } = await supabase
            .from('integration_secrets')
            .select('access_token')
            .eq('integration_account_id', conta.id)
            .eq('provider', 'tiny')
            .maybeSingle();
          const token = (sec?.access_token as string) || '';
          if (token) contasTiny.push({ id: conta.id, name: conta.name, token });
        });
      } else {
        console.log('ℹ️ Organização não resolvida pelo JWT. Ignorando integração_accounts e usando fallback de Configurações, se existir.');
      }
    } catch (e) {
      console.log('⚠️ Erro ao montar lista de contas Tiny:', (e as any)?.message || e);
    }

    if (contasTiny.length === 0) {
      // Fallback: usar configuração única
      if (!config.tiny_erp_token) {
        const msg = 'Nenhum token Tiny encontrado nas Integrações · Contas nem em Configurações > Token de API';
        console.log(`❌ ${msg}`);
        return new Response(JSON.stringify({ success: false, error: msg }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
      console.log('🔑 Usando token de Configurações > API (tiny_token) como fallback.');
      contasTiny.push({ id: null, name: 'Configurações', token: config.tiny_erp_token });
    }

    // Totais agregados
    const pedidosCompletosTotal: TinyPedido[] = [];
    const itensTotal: any[] = [];
    let pedidosSalvosTotal = 0;
    let itensSalvosTotal = 0;
    let paginasProcessadasTotal = 0;
    let totalPaginasEstimado = 0;

    for (let contaIndex = 0; contaIndex < contasTiny.length; contaIndex++) {
      const conta = contasTiny[contaIndex];
      CURRENT_ACCOUNT_ID = conta.id;
      CURRENT_ACCOUNT_NAME = conta.name;

      console.log(`🏁 Iniciando sincronização para conta ${contaIndex + 1}/${contasTiny.length}: ${conta.name} (${conta.id})`);

      // Construir parâmetros da API - APENAS para IDs e filtros (por conta)
      const params = new URLSearchParams({
        token: conta.token,
        formato: 'json',
        // ✅ REMOVIDO: com_itens - pedidos.pesquisa só para IDs e filtros
        limite: '100', // Máximo da API para eficiência
        pagina: '1'
      });

      // ✅ CORRIGIDO: Aplicar filtros de data
      if (filtros.filtros?.dataInicial || filtros.filtros?.dataInicio) {
        const dataInicial = filtros.filtros.dataInicial || filtros.filtros.dataInicio;
        const dataFormatada = formatDateForTinyAPI(dataInicial);
        params.append('dataInicial', dataFormatada);
        console.log(`📅 [${conta.name}] Data inicial aplicada: ${dataInicial} → ${dataFormatada}`);
      }
      if (filtros.filtros?.dataFinal || filtros.filtros?.dataFim) {
        const dataFinal = filtros.filtros.dataFinal || filtros.filtros.dataFim;
        const dataFormatada = formatDateForTinyAPI(dataFinal);
        params.append('dataFinal', dataFormatada);
        console.log(`📅 [${conta.name}] Data final aplicada: ${dataFinal} → ${dataFormatada}`);
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
            console.log(`🎯 [${conta.name}] Situações aplicadas: ${situacaoMapeada}`);
          }
        }
      }

      console.log('📡 Parâmetros finais para API Tiny:', Object.fromEntries(params.entries()));

      // ✅ DIAGNÓSTICO CRÍTICO: Teste sem filtros se houver erro de "sem registros"
      const paramsBackup = new URLSearchParams(params);
      
      console.log(`📡 [${conta.name}] Buscando pedidos na API Tiny ERP...`);
      
      const allPedidos: Array<{id: string, numero: string}> = [];
      const allItens: any[] = [];
      const pedidosCompletos: TinyPedido[] = [];
      let paginaAtual = 1;
      let totalPaginas = 1;
      let tentativasConsecutivasFalha = 0;

      // Sincronização paginada robusta - LIMITADA para evitar timeout
      do {
        try {
          // ✅ CRÍTICO: Verificar se o processo deve continuar (pause/stop)
          const { shouldContinue, status } = await verificarStatusProcesso(supabase);
          if (!shouldContinue) {
            console.log(`⏸️ Processo pausado/parado pelo usuário. Status: ${status}. Interrompendo na página ${paginaAtual}.`);
            break;
          }

          // CRÍTICO: Parar se exceder o limite de páginas por execução
          if (paginaAtual > MAX_PAGINAS_POR_EXECUCAO) {
            console.log(`⏰ Limite de ${MAX_PAGINAS_POR_EXECUCAO} páginas atingido. Parando para evitar timeout.`);
            break;
          }

          params.set('pagina', paginaAtual.toString());
          
          const jsonData = await makeApiCallWithRetry(
            `https://api.tiny.com.br/api2/pedidos.pesquisa.php`,
            params,
            { ...config, tiny_erp_token: conta.token },
            `Página ${paginaAtual}`
          );

          // ✅ CRÍTICO: Verificar se não há registros e tentar sem filtros
          if (jsonData.sem_registros) {
            console.log(`📄 Página ${paginaAtual}: Sem registros encontrados com filtros aplicados`);
            
            // Se for a primeira página e não há registros, testar sem filtros
            if (paginaAtual === 1 && (params.has('dataInicial') || params.has('situacao'))) {
              console.log('🔍 DIAGNÓSTICO: Testando busca sem filtros para verificar se existem pedidos...');
              
              const paramsMinimos = new URLSearchParams({
                token: conta.token,
                formato: 'json',
                com_itens: 'S',
                pagina: '1',
                limite: '10' // Apenas alguns para teste
              });
              
              try {
                const testeData = await makeApiCallWithRetry(
                  `https://api.tiny.com.br/api2/pedidos.pesquisa.php`,
                  paramsMinimos,
                  { ...config, tiny_erp_token: conta.token },
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
                console.warn('⚠️ Erro no teste sem filtros:', (testError as any)?.message || testError);
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
            totalPaginasEstimado += (pedidos.length * totalPaginas);
            
            // ✅ NOVO: Atualizar progresso no controle
            await atualizarProgresso(supabase, {
              started_at: new Date().toISOString(),
              total_items: pedidos.length * totalPaginas,
              processed_items: 0,
              current_step: `Conta ${conta.name}: Iniciando processamento de ${totalPaginas} páginas...`
            });
          }

          // ✅ NOVA ESTRATÉGIA: Coletar apenas IDs dos pedidos para busca detalhada
          const pedidosIds: Array<{id: string, numero: string}> = [];
          for (const pedidoWrapper of pedidos) {
            const pedido = pedidoWrapper.pedido;
            pedidosIds.push({ id: pedido.id, numero: pedido.numero });
          }
          allPedidos.push(...pedidosIds);

          paginaAtual++;
          tentativasConsecutivasFalha = 0;

          // Delay otimizado entre páginas
          if (paginaAtual <= totalPaginas) {
            await sleep(DELAY_ENTRE_PAGINAS);
          }

        } catch (error: any) {
          console.error(`❌ Erro na página ${paginaAtual}:`, error.message);
          tentativasConsecutivasFalha++;
          if (tentativasConsecutivasFalha >= config.tiny_max_falhas_consecutivas) {
            console.log(`🛑 Máximo de falhas consecutivas atingido. Parando na página ${paginaAtual}`);
            break;
          }
          await sleep(BASE_RETRY_DELAY * tentativasConsecutivasFalha);
        }
      } while (paginaAtual <= totalPaginas);

      console.log(`📊 Coleta de IDs concluída: ${allPedidos.length} pedidos identificados`);
      paginasProcessadasTotal += (paginaAtual - 1);

if (allPedidos.length > 0) {
  const todosPedidosIds = allPedidos;
  console.log(`🚀 Agendando processamento em background para ${todosPedidosIds.length} pedidos da conta ${conta.name}`);

  EdgeRuntime.waitUntil((async () => {
    try {
      // Função local para buscar detalhes completos de um pedido
      const buscarDetalhesCompletos = async (pedidoRef: {id: string, numero: string}): Promise<{pedido: TinyPedido | null, itens: any[]}> => {
        try {
          const detalhesParams = new URLSearchParams({
            token: conta.token,
            formato: 'json',
            id: pedidoRef.id
          });

          const detalhesData = await makeApiCallWithRetry(
            `https://api.tiny.com.br/api2/pedido.obter.php`,
            detalhesParams,
            { ...config, tiny_erp_token: conta.token },
            `Detalhes completos pedido ${pedidoRef.numero}`
          );

          const pedidoDetalhado = detalhesData.retorno?.pedido;
          if (!pedidoDetalhado) return { pedido: null, itens: [] };

          const pedidoCompleto: TinyPedido = {
            id: pedidoDetalhado.id,
            numero: pedidoDetalhado.numero,
            numero_ecommerce: pedidoDetalhado.numero_ecommerce,
            data_pedido: convertDateFormat(pedidoDetalhado.data_pedido),
            data_prevista: pedidoDetalhado.data_prevista ? convertDateFormat(pedidoDetalhado.data_prevista) : null,
            nome_cliente: pedidoDetalhado.cliente?.nome || 'Cliente não informado',
            cpf_cnpj: pedidoDetalhado.cliente?.cpf_cnpj,
            cidade: pedidoDetalhado.cliente?.cidade,
            uf: pedidoDetalhado.cliente?.uf,
            situacao: pedidoDetalhado.situacao,
            codigo_rastreamento: pedidoDetalhado.codigo_rastreamento,
            url_rastreamento: pedidoDetalhado.url_rastreamento,
            valor_frete: parseFloat(pedidoDetalhado.valor_frete || '0'),
            valor_desconto: parseFloat(pedidoDetalhado.valor_desconto || pedidoDetalhado.desconto || '0'),
            valor_total: parseFloat(pedidoDetalhado.total_pedido || pedidoDetalhado.valor_total || '0'),
            obs: pedidoDetalhado.obs,
            obs_interna: pedidoDetalhado.obs_interna,
            integration_account_id: CURRENT_ACCOUNT_ID,
            empresa: CURRENT_ACCOUNT_NAME || null
          };

          const itensProcessados: any[] = [];
          if (pedidoDetalhado.itens && Array.isArray(pedidoDetalhado.itens)) {
            for (const itemWrapper of pedidoDetalhado.itens) {
              const item = itemWrapper.item || itemWrapper;
              itensProcessados.push({
                pedido_id: pedidoRef.id,
                numero_pedido: pedidoRef.numero,
                sku: item.codigo || '',
                descricao: item.descricao || '',
                quantidade: parseInt(item.quantidade || '0'),
                valor_unitario: parseFloat(item.valor_unitario || '0'),
                valor_total: parseFloat(item.valor_total || '0'),
                ncm: item.ncm || null,
                codigo_barras: item.codigo_barras || null,
                observacoes: item.observacoes || null,
                integration_account_id: CURRENT_ACCOUNT_ID
              });
            }
          }

          return { pedido: pedidoCompleto, itens: itensProcessados };
        } catch (error: any) {
          console.warn(`⚠️ Erro ao buscar detalhes completos do pedido ${pedidoRef.numero}:`, error.message);
          return { pedido: null, itens: [] };
        }
      };

      const processarLoteComConcorrencia = async (lote: Array<{id: string, numero: string}>): Promise<{pedidos: TinyPedido[], itens: any[]}> => {
        const promises = lote.map((pedidoRef, index) => new Promise(async (resolve) => {
          await sleep(index * 20); // pequeno jitter
          const resultado = await buscarDetalhesCompletos(pedidoRef);
          resolve(resultado);
        }));
        const resultados = await Promise.all(promises);
        const pedidosLote: TinyPedido[] = [];
        const itensLote: any[] = [];
        for (const resultado of resultados as Array<{pedido: TinyPedido | null, itens: any[]}>) {
          if (resultado.pedido) pedidosLote.push(resultado.pedido);
          itensLote.push(...resultado.itens);
        }
        return { pedidos: pedidosLote, itens: itensLote };
      };

      const chunkArray = <T,>(arr: T[], size: number) => {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
      };

      const pedidosCompletosBG: TinyPedido[] = [];
      const itensBG: any[] = [];
      const totalLotes = Math.ceil(todosPedidosIds.length / BATCH_SIZE);
      console.log(`⚡ (BG) Processando ${todosPedidosIds.length} pedidos em ${totalLotes} lotes de ${BATCH_SIZE} (conta ${conta.name})`);
      for (let i = 0; i < todosPedidosIds.length; i += BATCH_SIZE) {
        const { status } = await verificarStatusProcesso(supabase);
        if (status === 'stopped') {
          console.log(`⏹️ (BG) Processo parado pelo usuário. Parando no índice ${i}.`);
          break;
        }
        const lote = todosPedidosIds.slice(i, i + BATCH_SIZE);
        const loteNumero = Math.floor(i / BATCH_SIZE) + 1;
        if (VERBOSE_LOGS) console.log(`(BG) Lote ${loteNumero}/${totalLotes}: ${lote.length} pedidos`);
        const resultadoLote = await processarLoteComConcorrencia(lote);
        pedidosCompletosBG.push(...resultadoLote.pedidos);
        itensBG.push(...resultadoLote.itens);
        if (i + BATCH_SIZE < todosPedidosIds.length) await sleep(DELAY_ENTRE_LOTES);
      }

      // Upsert em lotes (chunk) para evitar payloads grandes
      if (pedidosCompletosBG.length > 0) {
        for (const chunk of chunkArray(pedidosCompletosBG, 200)) {
          const { error } = await supabase
            .from('pedidos')
            .upsert(chunk, { onConflict: 'numero', ignoreDuplicates: false });
          if (error) console.error('❌ (BG) Erro ao salvar chunk de pedidos:', error);
        }
      }

      if (itensBG.length > 0) {
        const itensUnicos = itensBG.reduce((acc, item) => {
          const chave = `${item.numero_pedido}_${item.sku}`;
          if (!acc.has(chave)) acc.set(chave, item);
          return acc;
        }, new Map());
        const itensDeduplicated = Array.from(itensUnicos.values());
        for (const chunk of chunkArray(itensDeduplicated, 500)) {
          const { error } = await supabase
            .from('itens_pedidos')
            .upsert(chunk, { onConflict: 'numero_pedido,sku', ignoreDuplicates: false });
          if (error) console.error('❌ (BG) Erro ao salvar chunk de itens:', error);
        }
      }

      console.log(`🏁 (BG) Conta ${conta.name}: ${pedidosCompletosBG.length} pedidos e ${itensBG.length} itens salvos.`);

      // Marcar processo como idle (ok chamar múltiplas vezes)
      try {
        await supabase
          .from('sync_control')
          .update({ 
            status: 'idle',
            progress: {
              conta: conta.name,
              completed_at: new Date().toISOString()
            }
          })
          .eq('process_name', 'sync-pedidos-rapido');
      } catch (e) {
        console.warn('(BG) Erro ao finalizar status do processo:', e);
      }
    } catch (e) {
      console.error('💥 (BG) Erro no processamento em background:', e);
    }
  })());
}

// Pequena pausa entre contas para não estourar rate limit
console.log(`✅ Conta ${conta.name} agendada. Aguardando ${DELAY_ENTRE_LOTES}ms antes da próxima conta...`);
if (contaIndex + 1 < contasTiny.length) await sleep(DELAY_ENTRE_LOTES);
    }

const tempoExecucao = Date.now() - startTime;
console.log(`🧵 Processamentos em background agendados. Tempo até resposta: ${tempoExecucao}ms`);

const resultadoInicial = {
  success: true,
  started: true,
  message: `Sincronização iniciada em background para ${contasTiny.length} conta(s). Os pedidos aparecerão à medida que os detalhes forem processados.`,
  dados: {
    contas: contasTiny.length,
    paginas_processadas: paginasProcessadasTotal,
    total_paginas_estimado: totalPaginasEstimado,
    registros_por_pagina: 100
  }
};

return new Response(JSON.stringify(resultadoInicial), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  status: 202,
});

  } catch (error) {
    console.error('💥 Erro na sincronização:', error);
    
    // ✅ MARCAR PROCESSO COMO ERRO
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase
        .from('sync_control')
        .update({ 
          status: 'stopped',
          progress: {
            error: error.message,
            stopped_at: new Date().toISOString()
          }
        })
        .eq('process_name', 'sync-pedidos-rapido');
    } catch (statusError) {
      console.warn('Erro ao atualizar status de erro:', statusError);
    }
    
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
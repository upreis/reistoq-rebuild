import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configurações ultra-conservadoras
const REQUEST_TIMEOUT = 8000; // 8 segundos apenas
const MAX_RETRIES = 0; // Zero retries

interface TinyPedido {
  id: string;
  numero: string;
  data_pedido: string;
  nome_cliente: string;
  valor_total: number;
  situacao: string;
}

async function fetchWithTimeout(url: string, params: URLSearchParams): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error('TIMEOUT_8S');
    }
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('🚀 Sync rápido iniciado');

  try {
    const supabase = createClient(
      'https://tdjyfqnxvjgossuncpwm.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkanlmcW54dmpnb3NzdW5jcHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTczNTMsImV4cCI6MjA2OTQ3MzM1M30.qrEBpARgfuWF74zHoRzGJyWjgxN_oCG5DdKjPVGJYxk'
    );

    // Buscar configurações
    const { data: configData } = await supabase
      .from('configuracoes')
      .select('chave, valor')
      .in('chave', ['tiny_erp_token', 'tiny_erp_url']);

    const tinyToken = configData?.find(c => c.chave === 'tiny_erp_token')?.valor;
    const tinyApiUrl = configData?.find(c => c.chave === 'tiny_erp_url')?.valor;

    if (!tinyToken || !tinyApiUrl) {
      throw new Error('Configurações não encontradas');
    }

    const { filtros = {} } = await req.json().catch(() => ({}));
    
    // Parâmetros ultra-mínimos
    const params = new URLSearchParams({
      token: tinyToken,
      formato: 'JSON',
      pagina: '1'
      // SEM com_itens para máxima velocidade
    });

    // Aplicar filtros básicos se existirem
    if (filtros.dataInicio) {
      const data = new Date(filtros.dataInicio).toLocaleDateString('pt-BR');
      params.append('dataInicial', data);
    }
    
    if (filtros.dataFim) {
      const data = new Date(filtros.dataFim).toLocaleDateString('pt-BR');
      params.append('dataFinal', data);
    }

    console.log('📡 Fazendo requisição ultra-rápida...');
    
    // Buscar apenas primeira página sem itens
    const apiResponse = await fetchWithTimeout(
      `${tinyApiUrl}/pedidos.pesquisar.php`,
      params
    );

    let pedidos: TinyPedido[] = [];
    
    if (apiResponse.retorno?.status === 'OK' && apiResponse.retorno?.pedidos) {
      const pedidosRaw = Array.isArray(apiResponse.retorno.pedidos) 
        ? apiResponse.retorno.pedidos.map((p: any) => p.pedido)
        : [apiResponse.retorno.pedidos.pedido];

      // Processar apenas dados básicos
      pedidos = pedidosRaw.map((p: any) => ({
        id: p.id || '',
        numero: p.numero || '',
        data_pedido: p.data_pedido || '',
        nome_cliente: p.cliente?.nome || p.nome_cliente || '',
        valor_total: parseFloat(String(p.total_pedido || p.valor_total || '0').replace(',', '.')) || 0,
        situacao: (p.situacao || '').toLowerCase()
      }));
      
      console.log(`✅ ${pedidos.length} pedidos encontrados`);
    }

    // Salvar apenas os pedidos básicos
    let pedidosSalvos = 0;
    
    for (const pedido of pedidos) {
      try {
        const { error } = await supabase
          .from('pedidos')
          .upsert({
            numero: pedido.numero,
            data_pedido: pedido.data_pedido,
            nome_cliente: pedido.nome_cliente,
            valor_total: pedido.valor_total,
            situacao: pedido.situacao
          }, { onConflict: 'numero' });

        if (!error) {
          pedidosSalvos++;
        }
      } catch (e) {
        console.error('Erro ao salvar pedido:', e);
      }
    }

    const resultado = {
      total_encontrados: pedidos.length,
      pedidos_salvos: pedidosSalvos,
      tempo_execucao: Date.now() - startTime,
      message: `Sincronização rápida: ${pedidosSalvos} pedidos salvos em ${Date.now() - startTime}ms`
    };

    console.log('✅ Concluído:', resultado);

    return new Response(JSON.stringify({
      sucesso: true,
      dados: resultado,
      message: resultado.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    return new Response(JSON.stringify({
      sucesso: false,
      erro: error.message,
      tempo_execucao: Date.now() - startTime
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
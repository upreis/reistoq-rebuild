import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar token do Tiny ERP
    const { data: configs } = await supabaseClient
      .from('configuracoes')
      .select('chave, valor')
      .in('chave', ['tiny_token']);

    const tinyToken = configs?.find(c => c.chave === 'tiny_token')?.valor;

    if (!tinyToken) {
      throw new Error('Token do Tiny ERP não configurado');
    }

    console.log('Consultando pedido 2874 na API do Tiny ERP...');

    // Parâmetros para a API do Tiny
    const params = new URLSearchParams({
      token: tinyToken,
      formato: 'json',
      id: '2874'
    });

    // Fazer requisição para a API do Tiny
    const tinyResponse = await fetch(`https://api.tiny.com.br/api2/pedido.obter.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!tinyResponse.ok) {
      throw new Error(`Erro na API do Tiny: ${tinyResponse.status}`);
    }

    const tinyData = await tinyResponse.json();
    console.log('=== RESPOSTA COMPLETA DA API TINY ERP ===');
    console.log('Pedido 2874 - Estrutura completa dos dados:');
    console.log(JSON.stringify(tinyData, null, 2));

    // Verificar se houve erro na resposta
    if (tinyData.retorno.status === 'Erro') {
      const erros = tinyData.retorno.erros?.map(e => e.erro).join(', ') || 'Erro desconhecido';
      throw new Error(`Erro da API Tiny: ${erros}`);
    }

    // Verificar se o pedido foi encontrado
    if (!tinyData.retorno.pedido) {
      throw new Error('Pedido 2874 não encontrado');
    }

    const pedido = tinyData.retorno.pedido;

    // Estruturar resposta com TODOS os campos disponíveis
    const respostaCompleta = {
      status_api: tinyData.retorno.status,
      codigo_erro: tinyData.retorno.codigo_erro,
      pedido_completo: pedido,
      estrutura_cliente: pedido.cliente ? Object.keys(pedido.cliente) : [],
      estrutura_itens: pedido.itens && pedido.itens.length > 0 ? Object.keys(pedido.itens[0].item) : [],
      campos_disponiveis_pedido: Object.keys(pedido),
      campos_disponiveis_cliente: pedido.cliente ? Object.keys(pedido.cliente) : [],
      campos_disponiveis_item: pedido.itens && pedido.itens.length > 0 ? Object.keys(pedido.itens[0].item) : [],
      total_itens: pedido.itens ? pedido.itens.length : 0
    };

    console.log('=== ANÁLISE COMPLETA DOS CAMPOS DISPONÍVEIS ===');
    console.log('Campos do pedido:', respostaCompleta.campos_disponiveis_pedido);
    console.log('Campos do cliente:', respostaCompleta.campos_disponiveis_cliente);
    console.log('Campos dos itens:', respostaCompleta.campos_disponiveis_item);

    return new Response(JSON.stringify({
      success: true,
      dados_completos: respostaCompleta,
      message: 'Consulta realizada com sucesso - Todos os campos da API estão na resposta'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro ao consultar pedido 2874:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      message: 'Erro ao consultar pedido 2874 na API do Tiny ERP' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
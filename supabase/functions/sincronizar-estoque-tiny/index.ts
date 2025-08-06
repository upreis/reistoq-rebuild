import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SincronizarEstoqueRequest {
  produto_id: string;
  quantidade: number;
  tipo_movimentacao: 'B' | 'E'; // B = Baixa, E = Entrada
  observacoes?: string;
}

serve(async (req) => {
  console.log('=== Edge Function: sincronizar-estoque-tiny ===');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Buscar o token do Tiny
    const { data: config, error: configError } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'tiny_token')
      .single();

    if (configError || !config?.valor) {
      console.error('Token do Tiny não encontrado:', configError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token do Tiny ERP não configurado' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const tinyToken = config.valor;
    const { produto_id, quantidade, tipo_movimentacao, observacoes = 'Sincronização automática via REISTOQ' } = await req.json() as SincronizarEstoqueRequest;

    console.log('Sincronizando estoque no Tiny:', { produto_id, quantidade, tipo_movimentacao });

    // Buscar informações do produto
    const { data: produto, error: produtoError } = await supabase
      .from('produtos')
      .select('sku_interno, nome')
      .eq('id', produto_id)
      .single();

    if (produtoError || !produto) {
      console.error('Produto não encontrado:', produtoError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Produto não encontrado' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Tentar buscar o ID do produto no Tiny através do histórico de vendas
    const { data: historicoVenda } = await supabase
      .from('historico_vendas')
      .select('pedido_id')
      .eq('sku_estoque', produto.sku_interno)
      .limit(1);

    let idProdutoTiny = null;

    if (historicoVenda && historicoVenda.length > 0) {
      idProdutoTiny = historicoVenda[0].pedido_id;
    } else {
      // Se não encontrou no histórico, tentar buscar diretamente no Tiny usando o SKU
      console.log('Tentando buscar produto no Tiny pelo SKU:', produto.sku_interno);
      
      const pesquisaUrl = 'https://api.tiny.com.br/api2/produtos.pesquisa.php';
      const pesquisaFormData = new FormData();
      pesquisaFormData.append('token', tinyToken);
      pesquisaFormData.append('formato', 'json');
      pesquisaFormData.append('pesquisa', produto.sku_interno);

      const pesquisaResponse = await fetch(pesquisaUrl, {
        method: 'POST',
        body: pesquisaFormData,
      });

      const pesquisaResult = await pesquisaResponse.json();
      
      if (pesquisaResult.retorno?.status === 'OK' && pesquisaResult.retorno?.produtos?.length > 0) {
        idProdutoTiny = pesquisaResult.retorno.produtos[0].produto.id;
        console.log('Produto encontrado no Tiny com ID:', idProdutoTiny);
      }
    }

    if (!idProdutoTiny) {
      console.log('Produto não encontrado no Tiny ERP, pulando sincronização');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Produto não encontrado no Tiny ERP',
          details: `SKU: ${produto.sku_interno}` 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Preparar dados para a API do Tiny
    const estoqueData = {
      estoque: {
        idProduto: idProdutoTiny,
        tipo: tipo_movimentacao,
        quantidade: quantidade.toString(),
        observacoes: observacoes,
        deposito: "geral"
      }
    };

    console.log('Dados do estoque para envio:', estoqueData);

    // Fazer requisição para a API do Tiny
    const tinyUrl = 'https://api.tiny.com.br/api2/produto.atualizar.estoque.php';
    const formData = new FormData();
    formData.append('token', tinyToken);
    formData.append('formato', 'json');
    formData.append('estoque', JSON.stringify(estoqueData));

    console.log('Enviando requisição para o Tiny ERP...');

    const tinyResponse = await fetch(tinyUrl, {
      method: 'POST',
      body: formData,
    });

    const tinyResult = await tinyResponse.json();
    console.log('Resposta do Tiny ERP:', tinyResult);

    if (tinyResult.retorno?.status === 'OK') {
      console.log('Estoque sincronizado com sucesso no Tiny ERP');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Estoque sincronizado no Tiny ERP com sucesso',
          produto: produto.nome,
          tiny_response: tinyResult 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      console.error('Erro na resposta do Tiny ERP:', tinyResult);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao sincronizar estoque no Tiny ERP',
          details: tinyResult 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Erro na edge function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
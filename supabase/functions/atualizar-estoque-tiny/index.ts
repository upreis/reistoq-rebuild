import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AtualizarEstoqueRequest {
  idProduto: string;
  quantidade: number;
  observacoes?: string;
  tipo?: 'B' | 'E'; // B = Baixa, E = Entrada
}

serve(async (req) => {
  console.log('=== Edge Function: atualizar-estoque-tiny ===');
  
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
    const { idProduto, quantidade, observacoes = 'atualizado via REISTOQ', tipo = 'B' } = await req.json() as AtualizarEstoqueRequest;

    console.log('Atualizando estoque no Tiny:', { idProduto, quantidade, tipo });

    // Preparar dados para a API do Tiny
    const estoqueData = {
      estoque: {
        idProduto: idProduto,
        tipo: tipo,
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
      console.log('Estoque atualizado com sucesso no Tiny ERP');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Estoque atualizado no Tiny ERP com sucesso',
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
          error: 'Erro ao atualizar estoque no Tiny ERP',
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
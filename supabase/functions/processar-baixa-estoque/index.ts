import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ItemParaBaixaEstoque {
  id: string;
  numero_pedido: string;
  sku_pedido: string;
  sku_kit: string;
  quantidade_kit: number;
  quantidade_pedido: number;
  descricao: string;
  nome_cliente: string;
  data_pedido: string;
  valor_total: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { itens }: { itens: ItemParaBaixaEstoque[] } = await req.json();

    if (!itens || itens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhum item fornecido para processamento' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processando baixa de estoque para ${itens.length} itens`);

    const resultados = [];
    const erros = [];

    for (const item of itens) {
      try {
        // 1. Verificar se o produto existe no estoque
        const { data: produto, error: produtoError } = await supabase
          .from('produtos')
          .select('id, sku_interno, nome, quantidade_atual')
          .eq('sku_interno', item.sku_kit)
          .single();

        if (produtoError || !produto) {
          erros.push({
            item: item.numero_pedido,
            sku: item.sku_kit,
            erro: `Produto não encontrado no estoque: ${item.sku_kit}`
          });
          continue;
        }

        // 2. Verificar se há estoque suficiente
        if (produto.quantidade_atual < item.quantidade_kit) {
          erros.push({
            item: item.numero_pedido,
            sku: item.sku_kit,
            erro: `Estoque insuficiente. Disponível: ${produto.quantidade_atual}, Necessário: ${item.quantidade_kit}`
          });
          continue;
        }

        // 3. Verificar se já foi processado (evitar duplicatas)
        const { data: historicoExistente } = await supabase
          .from('historico_vendas')
          .select('id')
          .eq('id_unico', `${item.numero_pedido}-${item.sku_pedido}`)
          .single();

        if (historicoExistente) {
          console.log(`Item já processado: ${item.numero_pedido}-${item.sku_pedido}`);
          continue;
        }

        // 4. Fazer a baixa no estoque
        const novaQuantidade = produto.quantidade_atual - item.quantidade_kit;
        
        const { error: estoqueError } = await supabase
          .from('produtos')
          .update({ 
            quantidade_atual: novaQuantidade,
            ultima_movimentacao: new Date().toISOString()
          })
          .eq('id', produto.id);

        if (estoqueError) {
          throw estoqueError;
        }

        // 5. Registrar movimentação no estoque
        const { error: movimentacaoError } = await supabase
          .from('movimentacoes_estoque')
          .insert({
            produto_id: produto.id,
            tipo_movimentacao: 'saida',
            quantidade_anterior: produto.quantidade_atual,
            quantidade_nova: novaQuantidade,
            quantidade_movimentada: item.quantidade_kit,
            motivo: `Baixa automática - Pedido ${item.numero_pedido}`,
            observacoes: `SKU Pedido: ${item.sku_pedido} | Cliente: ${item.nome_cliente}`
          });

        if (movimentacaoError) {
          console.warn('Erro ao registrar movimentação:', movimentacaoError);
        }

        // 6. Registrar no histórico de vendas
        const { error: historicoError } = await supabase
          .from('historico_vendas')
          .insert({
            id_unico: `${item.numero_pedido}-${item.sku_pedido}`,
            numero_pedido: item.numero_pedido,
            sku_produto: item.sku_kit,
            nome_produto: produto.nome,
            quantidade_vendida: item.quantidade_kit,
            valor_unitario: item.valor_total / item.quantidade_pedido,
            valor_total: (item.valor_total / item.quantidade_pedido) * item.quantidade_kit,
            cliente_nome: item.nome_cliente,
            data_venda: item.data_pedido,
            status: 'estoque_baixado',
            observacoes: `Baixa automática via sistema. SKU Original: ${item.sku_pedido}`
          });

        if (historicoError) {
          throw historicoError;
        }

        // 7. Registrar no histórico geral
        const { error: historicoGeralError } = await supabase
          .from('historico')
          .insert({
            tipo: 'baixa_estoque_automatica',
            descricao: `Baixa automática de estoque - Pedido ${item.numero_pedido}`,
            detalhes: {
              numero_pedido: item.numero_pedido,
              sku_pedido: item.sku_pedido,
              sku_estoque: item.sku_kit,
              quantidade_baixada: item.quantidade_kit,
              produto_nome: produto.nome,
              cliente: item.nome_cliente,
              estoque_anterior: produto.quantidade_atual,
              estoque_atual: novaQuantidade
            }
          });

        if (historicoGeralError) {
          console.warn('Erro ao registrar histórico geral:', historicoGeralError);
        }

        resultados.push({
          numero_pedido: item.numero_pedido,
          sku_kit: item.sku_kit,
          quantidade_baixada: item.quantidade_kit,
          estoque_anterior: produto.quantidade_atual,
          estoque_atual: novaQuantidade,
          status: 'sucesso'
        });

        console.log(`✅ Baixa realizada: ${item.numero_pedido} - ${item.sku_kit} (${item.quantidade_kit} unidades)`);

      } catch (error) {
        console.error(`Erro ao processar item ${item.numero_pedido}:`, error);
        erros.push({
          item: item.numero_pedido,
          sku: item.sku_kit,
          erro: error.message
        });
      }
    }

    const response = {
      message: `Processamento concluído. ${resultados.length} itens processados com sucesso.`,
      processados: resultados.length,
      erros: erros.length,
      detalhes: {
        sucessos: resultados,
        erros: erros
      }
    };

    console.log('Resultado final:', response);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro geral na função processar-baixa-estoque:', error);
    return new Response(
      JSON.stringify({ 
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
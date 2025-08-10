import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função auxiliar para formatar moeda
function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

interface ItemParaBaixaEstoque {
  id: string;
  numero_pedido: string;
  sku_pedido: string;
  sku_kit: string;
  quantidade_kit: number; // QTD KIT x Qtd (já calculado)
  quantidade_pedido: number;
  qtd_kit: number; // QTD KIT original
  descricao: string;
  nome_cliente: string;
  data_pedido: string;
  valor_total: number;
  valor_unitario: number;
  numero_ecommerce?: string;
  situacao?: string;
  cidade?: string;
  uf?: string;
  cpf_cnpj?: string;
  // Campos adicionais para completar o histórico
  pedido_id?: string;
  ncm?: string;
  codigo_barras?: string;
  valor_frete?: number;
  valor_desconto?: number;
  data_prevista?: string;
  obs?: string;
  obs_interna?: string;
  url_rastreamento?: string;
  codigo_rastreamento?: string;
  integration_account_id?: string;
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
        // 1. Verificar se o produto existe no estoque usando sku_kit
        console.log(`🔍 Buscando produto no estoque com SKU: ${item.sku_kit}`);
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
            numero_venda: item.numero_ecommerce || item.numero_pedido,
            sku_produto: item.sku_pedido, // SKU original do pedido
            sku_estoque: item.sku_kit, // SKU do estoque/mapeado
            sku_kit: item.sku_kit, // SKU KIT (mesmo que sku_estoque)
            qtd_kit: item.qtd_kit, // QTD KIT original
            total_itens: item.quantidade_kit, // Total de itens (QTD KIT x Qtd)
            descricao: item.descricao,
            quantidade: item.quantidade_pedido, // Quantidade original do pedido
            valor_unitario: item.valor_unitario || (item.valor_total / item.quantidade_pedido),
            valor_total: item.valor_total,
            cliente_nome: item.nome_cliente,
            cliente_documento: item.cpf_cnpj,
            cpf_cnpj: item.cpf_cnpj,
            cidade: item.cidade,
            uf: item.uf,
            situacao: item.situacao,
            numero_ecommerce: item.numero_ecommerce,
            pedido_id: item.pedido_id,
            ncm: item.ncm,
            codigo_barras: item.codigo_barras,
            valor_frete: item.valor_frete,
            valor_desconto: item.valor_desconto,
            data_pedido: item.data_pedido,
            data_prevista: item.data_prevista,
            obs: item.obs,
            obs_interna: item.obs_interna,
            url_rastreamento: item.url_rastreamento,
            codigo_rastreamento: item.codigo_rastreamento,
            status: 'estoque_baixado',
            observacoes: `Baixa automática - SKU Pedido: ${item.sku_pedido} → SKU Kit: ${item.sku_kit}. QTD Kit: ${item.qtd_kit}. Total de Itens: ${item.quantidade_kit}. Valor: ${formatarMoeda(item.valor_total)}`,
            integration_account_id: item.integration_account_id || null,
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
              qtd_kit_original: item.qtd_kit,
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

        console.log(`✅ Baixa realizada: ${item.numero_pedido} - ${item.sku_kit} (${item.quantidade_kit} unidades = ${item.qtd_kit} kit x ${item.quantidade_pedido} qtd)`);

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
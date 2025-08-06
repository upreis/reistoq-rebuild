import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramConfig {
  bot_token: string;
  chat_id: string;
}

interface ItemProcessamento {
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

interface ResultadoProcessamento {
  total_itens: number;
  processados_sucesso: number;
  falta_estoque: number;
  falta_mapeamento: number;
  produtos_inativos: number;
  detalhes: {
    sucessos: any[];
    erros_estoque: any[];
    erros_mapeamento: any[];
    erros_produtos_inativos: any[];
  };
}

async function buscarConfiguracoesTelegram(supabase: any): Promise<TelegramConfig | null> {
  try {
    const { data: tokenData } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'telegram_token')
      .single();

    const { data: chatData } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'telegram_chat_id')
      .single();

    if (!tokenData?.valor || !chatData?.valor) {
      return null;
    }

    return {
      bot_token: tokenData.valor,
      chat_id: chatData.valor
    };
  } catch (error) {
    console.error('Erro ao buscar configurações do Telegram:', error);
    return null;
  }
}

async function enviarAlertaTelegram(config: TelegramConfig, message: string): Promise<void> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chat_id,
        text: message,
        parse_mode: 'HTML'
      })
    });

    if (!response.ok) {
      console.error('Erro ao enviar alerta Telegram:', await response.text());
    }
  } catch (error) {
    console.error('Erro ao enviar alerta Telegram:', error);
  }
}

async function buscarItensParaProcessamento(supabase: any): Promise<ItemProcessamento[]> {
  // Buscar itens de pedidos que ainda não foram processados
  const { data: itens, error } = await supabase
    .from('itens_pedidos')
    .select(`
      numero_pedido,
      sku,
      descricao,
      quantidade,
      valor_total,
      pedidos!inner(nome_cliente, data_pedido, situacao)
    `)
    .in('pedidos.situacao', ['Em aberto', 'Em andamento', 'Aguardando']);

  if (error) {
    throw new Error(`Erro ao buscar itens: ${error.message}`);
  }

  const itensProcessamento: ItemProcessamento[] = [];

  for (const item of itens || []) {
    // Buscar mapeamento DePara
    const { data: mapeamento } = await supabase
      .from('mapeamentos_depara')
      .select('sku_correspondente, quantidade')
      .eq('sku_pedido', item.sku)
      .eq('ativo', true)
      .single();

    if (mapeamento?.sku_correspondente) {
      itensProcessamento.push({
        numero_pedido: item.numero_pedido,
        sku_pedido: item.sku,
        sku_kit: mapeamento.sku_correspondente,
        quantidade_kit: item.quantidade * mapeamento.quantidade,
        quantidade_pedido: item.quantidade,
        descricao: item.descricao,
        nome_cliente: item.pedidos.nome_cliente,
        data_pedido: item.pedidos.data_pedido,
        valor_total: item.valor_total
      });
    }
  }

  return itensProcessamento;
}

async function processarBaixaAutomatica(supabase: any, itens: ItemProcessamento[]): Promise<ResultadoProcessamento> {
  const resultado: ResultadoProcessamento = {
    total_itens: itens.length,
    processados_sucesso: 0,
    falta_estoque: 0,
    falta_mapeamento: 0,
    produtos_inativos: 0,
    detalhes: {
      sucessos: [],
      erros_estoque: [],
      erros_mapeamento: [],
      erros_produtos_inativos: []
    }
  };

  for (const item of itens) {
    try {
      // Verificar se o produto existe e está ativo
      const { data: produto, error: produtoError } = await supabase
        .from('produtos')
        .select('id, sku_interno, nome, quantidade_atual, ativo')
        .eq('sku_interno', item.sku_kit)
        .single();

      if (produtoError || !produto) {
        resultado.falta_mapeamento++;
        resultado.detalhes.erros_mapeamento.push({
          numero_pedido: item.numero_pedido,
          sku_pedido: item.sku_pedido,
          sku_kit: item.sku_kit,
          erro: 'Produto não encontrado no estoque'
        });
        continue;
      }

      if (!produto.ativo) {
        resultado.produtos_inativos++;
        resultado.detalhes.erros_produtos_inativos.push({
          numero_pedido: item.numero_pedido,
          sku_pedido: item.sku_pedido,
          sku_kit: item.sku_kit,
          produto_nome: produto.nome,
          erro: 'Produto inativo'
        });
        continue;
      }

      // Verificar estoque disponível
      if (produto.quantidade_atual < item.quantidade_kit) {
        resultado.falta_estoque++;
        resultado.detalhes.erros_estoque.push({
          numero_pedido: item.numero_pedido,
          sku_pedido: item.sku_pedido,
          sku_kit: item.sku_kit,
          produto_nome: produto.nome,
          estoque_disponivel: produto.quantidade_atual,
          quantidade_necessaria: item.quantidade_kit,
          erro: 'Estoque insuficiente'
        });
        continue;
      }

      // Verificar se já foi processado
      const { data: jaProcessado } = await supabase
        .from('historico_vendas')
        .select('id')
        .eq('id_unico', `${item.numero_pedido}-${item.sku_pedido}`)
        .single();

      if (jaProcessado) {
        continue; // Pular se já foi processado
      }

      // Processar baixa do estoque
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

      // Registrar movimentação
      await supabase
        .from('movimentacoes_estoque')
        .insert({
          produto_id: produto.id,
          tipo_movimentacao: 'saida',
          quantidade_anterior: produto.quantidade_atual,
          quantidade_nova: novaQuantidade,
          quantidade_movimentada: item.quantidade_kit,
          motivo: `Baixa automática - Pedido ${item.numero_pedido}`,
          observacoes: `Processamento automático completo - SKU: ${item.sku_pedido}`
        });

      // Registrar no histórico de vendas
      await supabase
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
          status: 'processamento_automatico',
          observacoes: `Processamento automático completo. SKU Original: ${item.sku_pedido}`
        });

      // Registrar histórico geral
      await supabase
        .from('historico')
        .insert({
          tipo: 'processamento_automatico',
          descricao: `Processamento automático completo - Pedido ${item.numero_pedido}`,
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

      resultado.processados_sucesso++;
      resultado.detalhes.sucessos.push({
        numero_pedido: item.numero_pedido,
        sku_kit: item.sku_kit,
        produto_nome: produto.nome,
        quantidade_baixada: item.quantidade_kit,
        estoque_anterior: produto.quantidade_atual,
        estoque_atual: novaQuantidade
      });

    } catch (error) {
      console.error(`Erro ao processar item ${item.numero_pedido}:`, error);
      resultado.detalhes.erros_mapeamento.push({
        numero_pedido: item.numero_pedido,
        sku_pedido: item.sku_pedido,
        erro: error.message
      });
    }
  }

  return resultado;
}

function gerarMensagemTelegram(resultado: ResultadoProcessamento): string {
  let mensagem = `🤖 <b>PROCESSAMENTO AUTOMÁTICO COMPLETO</b>\n\n`;
  
  mensagem += `📊 <b>Resumo:</b>\n`;
  mensagem += `• Total de itens: ${resultado.total_itens}\n`;
  mensagem += `• ✅ Processados com sucesso: ${resultado.processados_sucesso}\n`;
  mensagem += `• ❌ Falta de estoque: ${resultado.falta_estoque}\n`;
  mensagem += `• 🔗 Falta mapeamento: ${resultado.falta_mapeamento}\n`;
  mensagem += `• ⚠️ Produtos inativos: ${resultado.produtos_inativos}\n\n`;

  if (resultado.detalhes.erros_estoque.length > 0) {
    mensagem += `🚨 <b>PRODUTOS SEM ESTOQUE:</b>\n`;
    resultado.detalhes.erros_estoque.slice(0, 5).forEach(erro => {
      mensagem += `• ${erro.produto_nome} (${erro.sku_kit})\n`;
      mensagem += `  Pedido: ${erro.numero_pedido}\n`;
      mensagem += `  Disponível: ${erro.estoque_disponivel} | Necessário: ${erro.quantidade_necessaria}\n\n`;
    });
    if (resultado.detalhes.erros_estoque.length > 5) {
      mensagem += `... e mais ${resultado.detalhes.erros_estoque.length - 5} produtos\n\n`;
    }
  }

  if (resultado.detalhes.erros_mapeamento.length > 0) {
    mensagem += `🔗 <b>PRODUTOS SEM MAPEAMENTO:</b>\n`;
    resultado.detalhes.erros_mapeamento.slice(0, 3).forEach(erro => {
      mensagem += `• SKU: ${erro.sku_pedido} (Pedido: ${erro.numero_pedido})\n`;
    });
    if (resultado.detalhes.erros_mapeamento.length > 3) {
      mensagem += `... e mais ${resultado.detalhes.erros_mapeamento.length - 3} SKUs\n\n`;
    }
  }

  if (resultado.detalhes.erros_produtos_inativos.length > 0) {
    mensagem += `⚠️ <b>PRODUTOS INATIVOS:</b>\n`;
    resultado.detalhes.erros_produtos_inativos.slice(0, 3).forEach(erro => {
      mensagem += `• ${erro.produto_nome} (${erro.sku_kit})\n`;
    });
    if (resultado.detalhes.erros_produtos_inativos.length > 3) {
      mensagem += `... e mais ${resultado.detalhes.erros_produtos_inativos.length - 3} produtos\n`;
    }
  }

  return mensagem;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🚀 Iniciando processamento automático completo...');

    // Buscar itens para processamento
    const itens = await buscarItensParaProcessamento(supabase);
    console.log(`📦 Encontrados ${itens.length} itens para processamento`);

    if (itens.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'Nenhum item encontrado para processamento',
          resultado: {
            total_itens: 0,
            processados_sucesso: 0,
            falta_estoque: 0,
            falta_mapeamento: 0,
            produtos_inativos: 0,
            detalhes: { sucessos: [], erros_estoque: [], erros_mapeamento: [], erros_produtos_inativos: [] }
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Processar baixas automáticas
    const resultado = await processarBaixaAutomatica(supabase, itens);
    console.log('📊 Resultado do processamento:', resultado);

    // Enviar alertas via Telegram se houver erros
    const temErros = resultado.falta_estoque > 0 || resultado.falta_mapeamento > 0 || resultado.produtos_inativos > 0;
    
    if (temErros) {
      const telegramConfig = await buscarConfiguracoesTelegram(supabase);
      if (telegramConfig) {
        const mensagem = gerarMensagemTelegram(resultado);
        await enviarAlertaTelegram(telegramConfig, mensagem);
        console.log('📱 Alertas enviados via Telegram');
      } else {
        console.warn('⚠️ Configurações do Telegram não encontradas');
      }
    }

    const response = {
      message: `Processamento concluído! ${resultado.processados_sucesso} itens processados com sucesso.`,
      resultado: resultado,
      alertas_enviados: temErros && await buscarConfiguracoesTelegram(supabase) !== null
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erro no processamento automático:', error);
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
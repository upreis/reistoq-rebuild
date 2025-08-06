import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AlertaConfig {
  tipo: string;
  habilitado: boolean;
  parametros: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔔 Iniciando sistema de alertas inteligentes...');

    // Buscar configurações de alertas
    const { data: configs } = await supabase
      .from('configuracoes')
      .select('chave, valor')
      .in('chave', [
        'alertas_estoque_baixo',
        'alertas_skus_pendentes', 
        'alertas_pedidos_parados',
        'alertas_sync_falhas',
        'telegram_token',
        'telegram_chat_id'
      ]);

    const configuracoes = Object.fromEntries(
      configs?.map(c => [c.chave, c.valor]) || []
    );

    if (!configuracoes.telegram_token || !configuracoes.telegram_chat_id) {
      console.log('⚠️ Telegram não configurado, pulando alertas');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Telegram não configurado',
          alertas_enviados: 0
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    let alertasEnviados = 0;
    const alertas: string[] = [];

    // 1. Alerta de Estoque Baixo
    if (configuracoes.alertas_estoque_baixo === 'true') {
      console.log('📦 Verificando estoque baixo...');
      
      const { data: produtosBaixos } = await supabase
        .from('produtos')
        .select('nome, sku_interno, quantidade_atual, estoque_minimo')
        .or('quantidade_atual.eq.0,quantidade_atual.lte.estoque_minimo')
        .eq('ativo', true)
        .limit(10);

      if (produtosBaixos && produtosBaixos.length > 0) {
        const msg = `🚨 *ESTOQUE BAIXO*\n\n${produtosBaixos.map(p => 
          `• ${p.nome} (${p.sku_interno})\n  📊 Atual: ${p.quantidade_atual} | Mín: ${p.estoque_minimo}`
        ).join('\n\n')}\n\n⏰ ${new Date().toLocaleString('pt-BR')}`;
        
        alertas.push(msg);
      }
    }

    // 2. Alerta de SKUs Pendentes
    if (configuracoes.alertas_skus_pendentes === 'true') {
      console.log('🗺️ Verificando SKUs pendentes...');
      
      const { data: skusPendentes } = await supabase
        .from('mapeamentos_depara')
        .select('sku_pedido, pedidos_aguardando, prioridade, created_at')
        .is('sku_correspondente', null)
        .eq('ativo', true)
        .order('prioridade', { ascending: false })
        .order('pedidos_aguardando', { ascending: false })
        .limit(10);

      if (skusPendentes && skusPendentes.length > 0) {
        const totalPedidosAguardando = skusPendentes.reduce((sum, s) => sum + (s.pedidos_aguardando || 0), 0);
        
        const msg = `⏳ *SKUs PENDENTES*\n\n${skusPendentes.map(s => 
          `• ${s.sku_pedido}\n  📋 ${s.pedidos_aguardando || 0} pedidos aguardando\n  ⚡ Prioridade: ${s.prioridade}`
        ).join('\n\n')}\n\n📊 Total: ${totalPedidosAguardando} pedidos aguardando\n⏰ ${new Date().toLocaleString('pt-BR')}`;
        
        alertas.push(msg);
      }
    }

    // 3. Alerta de Pedidos Parados
    if (configuracoes.alertas_pedidos_parados === 'true') {
      console.log('⏸️ Verificando pedidos parados...');
      
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 7); // Pedidos há mais de 7 dias
      
      const { data: pedidosParados } = await supabase
        .from('pedidos')
        .select('numero, nome_cliente, data_pedido, situacao, valor_total')
        .in('situacao', ['Em aberto', 'Aprovado', 'Preparando envio'])
        .lt('data_pedido', dataLimite.toISOString().split('T')[0])
        .order('data_pedido', { ascending: true })
        .limit(5);

      if (pedidosParados && pedidosParados.length > 0) {
        const valorTotal = pedidosParados.reduce((sum, p) => sum + p.valor_total, 0);
        
        const msg = `⏸️ *PEDIDOS PARADOS*\n\n${pedidosParados.map(p => 
          `• #${p.numero} - ${p.nome_cliente}\n  📅 ${new Date(p.data_pedido).toLocaleDateString('pt-BR')}\n  💰 R$ ${p.valor_total.toFixed(2)}\n  📋 ${p.situacao}`
        ).join('\n\n')}\n\n💰 Valor total parado: R$ ${valorTotal.toFixed(2)}\n⏰ ${new Date().toLocaleString('pt-BR')}`;
        
        alertas.push(msg);
      }
    }

    // 4. Alerta de Falhas de Sincronização
    if (configuracoes.alertas_sync_falhas === 'true') {
      console.log('🔄 Verificando falhas de sincronização...');
      
      const { data: ultimaFalha } = await supabase
        .from('historico')
        .select('created_at, descricao, detalhes')
        .eq('tipo', 'sync_automatico_erro')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (ultimaFalha) {
        const horasAtras = Math.floor((Date.now() - new Date(ultimaFalha.created_at).getTime()) / (1000 * 60 * 60));
        
        if (horasAtras <= 1) { // Falha nas últimas 1 hora
          const msg = `❌ *FALHA DE SINCRONIZAÇÃO*\n\n🕐 Há ${horasAtras === 0 ? 'menos de 1 hora' : `${horasAtras} hora(s)`}\n\n📝 ${ultimaFalha.descricao}\n\n⏰ ${new Date().toLocaleString('pt-BR')}`;
          alertas.push(msg);
        }
      }
    }

    // Enviar alertas via Telegram
    for (const alerta of alertas) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${configuracoes.telegram_token}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: configuracoes.telegram_chat_id,
            text: alerta,
            parse_mode: 'Markdown'
          })
        });

        if (response.ok) {
          alertasEnviados++;
          console.log('✅ Alerta enviado via Telegram');
        } else {
          console.error('❌ Erro ao enviar alerta:', await response.text());
        }
      } catch (error) {
        console.error('❌ Erro ao enviar alerta:', error);
      }
    }

    // Registrar no histórico
    await supabase
      .from('historico')
      .insert({
        tipo: 'alertas_inteligentes',
        descricao: `Sistema de alertas executado - ${alertasEnviados} alertas enviados`,
        detalhes: { alertas_enviados: alertasEnviados, tipos_verificados: Object.keys(configuracoes).filter(k => k.startsWith('alertas_') && configuracoes[k] === 'true') }
      });

    console.log(`✅ Sistema de alertas concluído - ${alertasEnviados} alertas enviados`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sistema de alertas executado com sucesso`,
        alertas_enviados: alertasEnviados,
        tipos_verificados: Object.keys(configuracoes).filter(k => k.startsWith('alertas_') && configuracoes[k] === 'true').length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('❌ Erro no sistema de alertas:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.toString()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
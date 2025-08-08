import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🚨 Verificando alertas de estoque baixo...')

    // Buscar configurações do Telegram
    const { data: config, error: configError } = await supabase
      .from('configuracoes')
      .select('chave, valor')
      .in('chave', ['telegram_token', 'telegram_chat_id'])

    if (configError) {
      console.error('Erro ao buscar configurações:', configError)
      throw configError
    }

    const telegram_token = config?.find(c => c.chave === 'telegram_token')?.valor
    const telegram_chat_id = config?.find(c => c.chave === 'telegram_chat_id')?.valor

    if (!telegram_token || !telegram_chat_id) {
      console.log('ℹ️ Telegram não configurado, criando alertas no sistema...')
    }

    // Buscar produtos com estoque baixo
    const { data: produtos, error: produtosError } = await supabase
      .from('produtos')
      .select('*')
      .eq('ativo', true)
      .or('quantidade_atual.lte.estoque_minimo,quantidade_atual.eq.0')
      .order('quantidade_atual', { ascending: true })

    if (produtosError) {
      console.error('Erro ao buscar produtos:', produtosError)
      throw produtosError
    }

    console.log(`📦 Encontrados ${produtos?.length || 0} produtos com estoque baixo`)

    if (!produtos || produtos.length === 0) {
      // Criar alerta informativo de que tudo está ok
      await supabase
        .from('system_alerts')
        .insert({
          kind: 'success',
          message: 'Todos os produtos estão com estoque adequado.',
          priority: 1,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Expira em 24h
        })

      return new Response(
        JSON.stringify({ 
          success: true, 
          alertas_criados: 1,
          produtos_alertados: 0,
          tipo: 'estoque_ok'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar alertas no sistema para cada produto
    const alertasParaCriar = produtos.map(produto => ({
      kind: produto.quantidade_atual === 0 ? 'destructive' : 'warning',
      message: produto.quantidade_atual === 0 
        ? `Produto "${produto.nome}" está em falta (estoque zerado)`
        : `Produto "${produto.nome}" com estoque baixo: ${produto.quantidade_atual} unidades (mínimo: ${produto.estoque_minimo})`,
      priority: produto.quantidade_atual === 0 ? 3 : 2,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Expira em 7 dias
    }))

    const { error: alertasError } = await supabase
      .from('system_alerts')
      .insert(alertasParaCriar)

    if (alertasError) {
      console.error('Erro ao criar alertas:', alertasError)
      throw alertasError
    }

    // Enviar para Telegram se configurado
    if (telegram_token && telegram_chat_id) {
      const produtosSemEstoque = produtos.filter(p => p.quantidade_atual === 0)
      const produtosEstoqueBaixo = produtos.filter(p => p.quantidade_atual > 0 && p.quantidade_atual <= p.estoque_minimo)

      let mensagem = '🚨 *ALERTA DE ESTOQUE - REISTOQ*\n\n'
      
      if (produtosSemEstoque.length > 0) {
        mensagem += '❌ *PRODUTOS EM FALTA:*\n'
        produtosSemEstoque.forEach(produto => {
          mensagem += `• ${produto.nome} (SKU: ${produto.sku})\n`
        })
        mensagem += '\n'
      }

      if (produtosEstoqueBaixo.length > 0) {
        mensagem += '⚠️ *ESTOQUE BAIXO:*\n'
        produtosEstoqueBaixo.forEach(produto => {
          mensagem += `• ${produto.nome}: ${produto.quantidade_atual}/${produto.estoque_minimo} (SKU: ${produto.sku})\n`
        })
      }

      mensagem += `\n📊 Total de produtos com problemas: ${produtos.length}`
      mensagem += `\n⏰ Verificado em: ${new Date().toLocaleString('pt-BR')}`

      // Enviar para Telegram
      const telegramResponse = await fetch(`https://api.telegram.org/bot${telegram_token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegram_chat_id,
          text: mensagem,
          parse_mode: 'Markdown'
        })
      })

      if (!telegramResponse.ok) {
        console.error('Erro ao enviar mensagem para Telegram:', await telegramResponse.text())
      } else {
        console.log('✅ Mensagem enviada para Telegram com sucesso')
      }
    }

    // Registrar no histórico
    await supabase
      .from('historico')
      .insert({
        tipo: 'sistema',
        descricao: `Verificação automática de estoque: ${produtos.length} produtos com alertas`,
        detalhes: {
          produtos_alertados: produtos.length,
          produtos_sem_estoque: produtos.filter(p => p.quantidade_atual === 0).length,
          produtos_estoque_baixo: produtos.filter(p => p.quantidade_atual > 0 && p.quantidade_atual <= p.estoque_minimo).length,
          telegram_enviado: !!(telegram_token && telegram_chat_id)
        }
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        alertas_criados: alertasParaCriar.length,
        produtos_alertados: produtos.length,
        telegram_enviado: !!(telegram_token && telegram_chat_id),
        tipo: 'alertas_estoque'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro na função de alertas:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        alertas_criados: 0 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

serve(handler)
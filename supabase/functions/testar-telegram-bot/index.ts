import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Buscar configurações do Telegram
    const { data: configs, error: configError } = await supabase
      .from('configuracoes')
      .select('chave, valor')
      .in('chave', ['telegram_token', 'telegram_chat_id'])

    if (configError) {
      console.error('Erro ao buscar configurações:', configError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao buscar configurações do Telegram' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    const telegramToken = configs?.find(c => c.chave === 'telegram_token')?.valor
    const telegramChatId = configs?.find(c => c.chave === 'telegram_chat_id')?.valor

    if (!telegramToken || !telegramChatId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token ou Chat ID do Telegram não configurados' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    console.log('Testando envio de mensagem para Telegram...')

    // Primeiro, testar se o bot é válido
    const botInfoResponse = await fetch(`https://api.telegram.org/bot${telegramToken}/getMe`)
    const botInfo = await botInfoResponse.json()

    if (!botInfo.ok) {
      console.error('Bot Token inválido:', botInfo)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Token do bot Telegram inválido'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Enviar mensagem de teste
    const mensagem = `🧪 *Teste de Conexão REISTOQ*

✅ Bot: @${botInfo.result.username}
📱 Chat ID: ${telegramChatId}
🕐 Data: ${new Date().toLocaleString('pt-BR')}

🎉 *Conexão estabelecida com sucesso!*`

    const telegramResponse = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: mensagem,
        parse_mode: 'Markdown'
      })
    })

    const telegramData = await telegramResponse.json()
    console.log('Resposta do Telegram:', telegramData)

    if (telegramData.ok) {
      return new Response(
        JSON.stringify({
          success: true,
          bot: {
            username: botInfo.result.username,
            first_name: botInfo.result.first_name
          },
          message: 'Mensagem de teste enviada com sucesso!'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    } else {
      console.error('Erro ao enviar mensagem:', telegramData)
      return new Response(
        JSON.stringify({
          success: false,
          error: `Erro do Telegram: ${telegramData.description || 'Erro desconhecido'}`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

  } catch (error) {
    console.error('Erro ao testar Telegram:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro interno do servidor ao testar Telegram'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Inicializar cliente Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface TelegramConfig {
  bot_token: string;
  chat_id: string;
}

async function enviarTelegram(config: TelegramConfig, message: string): Promise<any> {
  try {
    const telegramUrl = `https://api.telegram.org/bot${config.bot_token}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: config.chat_id,
        text: message,
        parse_mode: 'HTML'
      }),
    });

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao enviar mensagem para Telegram:', error);
    throw error;
  }
}

async function buscarConfiguracoes(): Promise<{ telegram: TelegramConfig }> {
  const { data: telegramToken, error: tokenError } = await supabase
    .from('configuracoes')
    .select('valor')
    .eq('chave', 'telegram_token_depara')
    .single();

  const { data: telegramChatId, error: chatError } = await supabase
    .from('configuracoes')
    .select('valor')
    .eq('chave', 'telegram_chat_id_depara')
    .single();

  if (tokenError || chatError || !telegramToken || !telegramChatId) {
    throw new Error('Configurações do Telegram não encontradas para DePara');
  }

  return {
    telegram: {
      bot_token: telegramToken.valor,
      chat_id: telegramChatId.valor,
    }
  };
}

async function buscarSkusPendentes(): Promise<any[]> {
  const { data: skusPendentes, error } = await supabase
    .from('mapeamentos_depara')
    .select('*')
    .is('sku_correspondente', null)
    .eq('ativo', true);

  if (error) {
    console.error('Erro ao buscar SKUs pendentes:', error);
    throw error;
  }

  return skusPendentes || [];
}

function gerarMensagemTelegram(skusPendentes: any[]): string {
  const totalPendentes = skusPendentes.length;
  
  let mensagem = `🔄 <b>ALERTA: SKUs DE/PARA PENDENTES</b>\n\n`;
  mensagem += `📋 <b>Total de SKUs aguardando mapeamento:</b> ${totalPendentes}\n\n`;

  if (totalPendentes > 0) {
    mensagem += `📦 <b>SKUs pendentes:</b>\n`;
    
    // Limitar a 10 SKUs na mensagem para não ficar muito longa
    const skusParaMostrar = skusPendentes.slice(0, 10);
    
    skusParaMostrar.forEach((sku, index) => {
      mensagem += `${index + 1}. <code>${sku.sku_pedido}</code>\n`;
      if (sku.observacoes) {
        mensagem += `   💬 ${sku.observacoes}\n`;
      }
    });

    if (totalPendentes > 10) {
      mensagem += `\n... e mais ${totalPendentes - 10} SKUs pendentes\n`;
    }

    mensagem += `\n⚠️ <b>Ação necessária:</b> Acesse o sistema e preencha os SKUs correspondentes para que os pedidos possam continuar o processamento.\n`;
  }

  mensagem += `\n🕐 <b>Data/Hora:</b> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;

  return mensagem;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Iniciando verificação de SKUs pendentes...');

    // Buscar SKUs pendentes
    const skusPendentes = await buscarSkusPendentes();
    console.log(`Encontrados ${skusPendentes.length} SKUs pendentes`);

    if (skusPendentes.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhum SKU pendente encontrado',
          skus_pendentes: 0
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Buscar configurações do Telegram
    const config = await buscarConfiguracoes();
    console.log('Configurações do Telegram encontradas');

    // Gerar mensagem
    const mensagem = gerarMensagemTelegram(skusPendentes);
    console.log('Mensagem gerada:', mensagem);

    // Enviar para Telegram
    const telegramResponse = await enviarTelegram(config.telegram, mensagem);
    console.log('Mensagem enviada com sucesso:', telegramResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Alerta de SKUs pendentes enviado com sucesso',
        skus_pendentes: skusPendentes.length,
        telegram_response: telegramResponse
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Erro na função de alertas DePara:', error);
    
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
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuração do Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Configuração dos serviços
const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface TelegramConfig {
  bot_token: string;
  chat_id: string;
}

interface EmailConfig {
  from: string;
  to: string[];
}

const enviarTelegram = async (config: TelegramConfig, message: string) => {
  const url = `https://api.telegram.org/bot${config.bot_token}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chat_id,
        text: message,
        parse_mode: 'HTML'
      })
    });

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao enviar Telegram:', error);
    throw error;
  }
};

const enviarEmail = async (config: EmailConfig, subject: string, html: string) => {
  try {
    const result = await resend.emails.send({
      from: config.from,
      to: config.to,
      subject,
      html
    });
    return result;
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    throw error;
  }
};

const buscarConfiguracoes = async () => {
  const { data: configs, error } = await supabase
    .from('configuracoes')
    .select('chave, valor')
    .in('chave', ['telegram_token', 'telegram_chat_id', 'email_alertas', 'email_from']);

  if (error) {
    throw new Error(`Erro ao buscar configurações: ${error.message}`);
  }

  const configMap = configs.reduce((acc: any, config) => {
    acc[config.chave] = config.valor;
    return acc;
  }, {});

  return {
    telegram: {
      bot_token: configMap.telegram_token,
      chat_id: configMap.telegram_chat_id
    },
    email: {
      from: configMap.email_from || 'alertas@reistoq.com',
      to: configMap.email_alertas ? configMap.email_alertas.split(',') : []
    }
  };
};

const buscarProdutosEmAlerta = async () => {
  const { data: produtos, error } = await supabase
    .from('produtos')
    .select('id, sku_interno, nome, categoria, quantidade_atual, estoque_minimo, estoque_maximo')
    .eq('ativo', true)
    .or('quantidade_atual.eq.0,quantidade_atual.lte.estoque_minimo');

  if (error) {
    throw new Error(`Erro ao buscar produtos: ${error.message}`);
  }

  return produtos || [];
};

const gerarMensagemTelegram = (produtos: any[]) => {
  const produtosCriticos = produtos.filter(p => p.quantidade_atual === 0);
  const produtosBaixos = produtos.filter(p => p.quantidade_atual > 0 && p.quantidade_atual <= p.estoque_minimo);

  let mensagem = '🚨 <b>ALERTA DE ESTOQUE - REISTOQ</b> 🚨\n\n';

  if (produtosCriticos.length > 0) {
    mensagem += '❌ <b>PRODUTOS EM FALTA:</b>\n';
    produtosCriticos.forEach(produto => {
      mensagem += `• ${produto.nome} (${produto.sku_interno})\n`;
    });
    mensagem += '\n';
  }

  if (produtosBaixos.length > 0) {
    mensagem += '⚠️ <b>PRODUTOS COM ESTOQUE BAIXO:</b>\n';
    produtosBaixos.forEach(produto => {
      mensagem += `• ${produto.nome} (${produto.sku_interno}) - ${produto.quantidade_atual} unidades\n`;
    });
  }

  mensagem += `\n📊 Total de produtos em alerta: ${produtos.length}`;
  mensagem += '\n⏰ ' + new Date().toLocaleString('pt-BR');

  return mensagem;
};

const gerarEmailHtml = (produtos: any[]) => {
  const produtosCriticos = produtos.filter(p => p.quantidade_atual === 0);
  const produtosBaixos = produtos.filter(p => p.quantidade_atual > 0 && p.quantidade_atual <= p.estoque_minimo);

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .alert-section { margin: 20px 0; }
            .critical { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; }
            .product-list { list-style-type: none; padding: 0; }
            .product-item { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .footer { background: #f3f4f6; padding: 15px; text-align: center; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🚨 ALERTA DE ESTOQUE - REISTOQ</h1>
        </div>
        
        <div class="content">
            ${produtosCriticos.length > 0 ? `
            <div class="alert-section critical">
                <h2>❌ PRODUTOS EM FALTA (${produtosCriticos.length})</h2>
                <ul class="product-list">
                    ${produtosCriticos.map(produto => `
                        <li class="product-item">
                            <strong>${produto.nome}</strong> (${produto.sku_interno})
                            <br><small>Categoria: ${produto.categoria || 'Não informada'}</small>
                        </li>
                    `).join('')}
                </ul>
            </div>
            ` : ''}
            
            ${produtosBaixos.length > 0 ? `
            <div class="alert-section warning">
                <h2>⚠️ PRODUTOS COM ESTOQUE BAIXO (${produtosBaixos.length})</h2>
                <ul class="product-list">
                    ${produtosBaixos.map(produto => `
                        <li class="product-item">
                            <strong>${produto.nome}</strong> (${produto.sku_interno})
                            <br><small>Estoque atual: ${produto.quantidade_atual} | Mínimo: ${produto.estoque_minimo}</small>
                            <br><small>Categoria: ${produto.categoria || 'Não informada'}</small>
                        </li>
                    `).join('')}
                </ul>
            </div>
            ` : ''}
        </div>
        
        <div class="footer">
            <p><strong>Total de produtos em alerta:</strong> ${produtos.length}</p>
            <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            <p><small>Este é um alerta automático do sistema REISTOQ</small></p>
        </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Iniciando verificação de alertas de estoque...');

    // Buscar produtos em alerta
    const produtos = await buscarProdutosEmAlerta();
    
    if (produtos.length === 0) {
      console.log('Nenhum produto em alerta encontrado');
      return new Response(
        JSON.stringify({ message: 'Nenhum produto em alerta encontrado' }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    console.log(`Encontrados ${produtos.length} produtos em alerta`);

    // Buscar configurações
    const configs = await buscarConfiguracoes();
    
    const resultados = {
      telegram: null as any,
      email: null as any,
      produtos_alerta: produtos.length
    };

    // Enviar alerta via Telegram
    if (configs.telegram.bot_token && configs.telegram.chat_id) {
      try {
        const mensagemTelegram = gerarMensagemTelegram(produtos);
        resultados.telegram = await enviarTelegram(configs.telegram, mensagemTelegram);
        console.log('Alerta enviado via Telegram com sucesso');
      } catch (error) {
        console.error('Erro ao enviar Telegram:', error);
        resultados.telegram = { error: error.message };
      }
    } else {
      console.log('Configurações do Telegram não encontradas');
    }

    // Enviar alerta via Email
    if (configs.email.to.length > 0) {
      try {
        const htmlEmail = gerarEmailHtml(produtos);
        resultados.email = await enviarEmail(
          configs.email,
          `🚨 Alerta de Estoque - ${produtos.length} produtos precisam de atenção`,
          htmlEmail
        );
        console.log('Alerta enviado via email com sucesso');
      } catch (error) {
        console.error('Erro ao enviar email:', error);
        resultados.email = { error: error.message };
      }
    } else {
      console.log('Configurações de email não encontradas');
    }

    return new Response(
      JSON.stringify(resultados),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Erro no processamento de alertas:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
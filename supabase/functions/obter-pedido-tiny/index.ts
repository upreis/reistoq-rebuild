import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TinyPedidoDetalhes {
  id: string;
  numero: string;
  numero_ecommerce?: string;
  data_pedido: string;
  data_prevista?: string;
  situacao: string;
  codigo_rastreamento?: string;
  url_rastreamento?: string;
  cliente: {
    nome: string;
    cpf_cnpj?: string;
    endereco?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
    telefone?: string;
    email?: string;
  };
  itens: Array<{
    item: {
      codigo: string;
      descricao: string;
      unidade: string;
      quantidade: number;
      valor_unitario: number;
      valor_total: number;
    }
  }>;
  valor_frete: number;
  valor_desconto: number;
  valor_total: number;
  obs?: string;
  obs_interna?: string;
}

interface TinyApiResponse {
  retorno: {
    status: string;
    codigo_erro?: number;
    erros?: Array<{ erro: string }>;
    pedido?: TinyPedidoDetalhes;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obter dados do body e possível conta de integração
    let numeroPedido: string | undefined;
    let integrationAccountId: string | undefined;
    try {
      const body = await req.json();
      numeroPedido = body?.numeroPedido;
      integrationAccountId = body?.integration_account_id || body?.integrationAccountId;
    } catch (_) {}

    if (!numeroPedido) {
      throw new Error('Número do pedido é obrigatório');
    }

    // Buscar configurações do Tiny ERP (URL e fallback de token)
    const { data: configs } = await supabaseClient
      .from('configuracoes')
      .select('chave, valor')
      .in('chave', ['tiny_token', 'tiny_api_url']);

    let tinyToken: string | undefined = configs?.find(c => c.chave === 'tiny_token')?.valor;
    const tinyApiUrl = configs?.find(c => c.chave === 'tiny_api_url')?.valor || 'https://api.tiny.com.br/api2';

    // Resolução de token Tiny com suporte multi-conta (sem ambiguidade)
    try {
      const authHeader = req.headers.get('Authorization') || '';
      const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

      if (integrationAccountId) {
        const { data: acc, error: accErr } = await supabaseClient
          .from('integration_accounts')
          .select('id, provider, is_active, auth_data')
          .eq('id', integrationAccountId)
          .eq('provider', 'tiny')
          .maybeSingle();
        if (accErr) throw accErr;
        if (!acc || !acc.is_active) throw new Error('Conta Tiny informada não existe ou está inativa');
        const tokenFromAccount = acc?.auth_data?.tiny_token || acc?.auth_data?.token;
        if (!tokenFromAccount) throw new Error('Conta Tiny informada não possui token configurado');
        tinyToken = tokenFromAccount;
        console.log('🔑 Token resolvido da conta Tiny específica:', integrationAccountId);
      } else if (jwt) {
        const { data: userData } = await supabaseClient.auth.getUser(jwt);
        const userId = userData?.user?.id;
        if (userId) {
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('organizacao_id')
            .eq('id', userId)
            .maybeSingle();
          const orgId = profile?.organizacao_id;
          if (orgId) {
            const { data: accs } = await supabaseClient
              .from('integration_accounts')
              .select('id, provider, is_active, auth_data')
              .eq('organization_id', orgId)
              .eq('provider', 'tiny')
              .eq('is_active', true);
            const contasAtivas = (accs || []).filter((a: any) => (a.auth_data?.tiny_token || a.auth_data?.token));
            if (contasAtivas.length === 1) {
              const a = contasAtivas[0] as any;
              tinyToken = a.auth_data?.tiny_token || a.auth_data?.token;
              console.log('🔑 Token resolvido da única conta Tiny ativa da organização:', a.id);
            } else if (contasAtivas.length > 1) {
              throw new Error('Há múltiplas contas Tiny ativas. Informe integration_account_id.');
            }
          }
        }
      }
    } catch (e) {
      console.log('⚠️ Falha ao resolver token via integration_accounts:', (e as any)?.message || e);
      throw e;
    }

    // Fallback final: variável de ambiente
    if (!tinyToken) {
      const envToken = Deno.env.get('TINY_TOKEN');
      if (envToken) tinyToken = envToken;
    }

    if (!tinyToken) {
      throw new Error('Token do Tiny ERP não configurado');
    }
    console.log('Buscando detalhes do pedido:', numeroPedido);

    // Parâmetros para a API do Tiny
    const params = new URLSearchParams({
      token: tinyToken,
      formato: 'json',
      id: numeroPedido
    });

    // Fazer requisição para a API do Tiny
    const tinyResponse = await fetch(`https://api.tiny.com.br/api2/pedido.obter.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!tinyResponse.ok) {
      throw new Error(`Erro na API do Tiny: ${tinyResponse.status}`);
    }

    const tinyData: TinyApiResponse = await tinyResponse.json();
    console.log('Resposta da API Tiny:', tinyData.retorno.status);

    // Verificar se houve erro na resposta
    if (tinyData.retorno.status === 'Erro') {
      const erros = tinyData.retorno.erros?.map(e => e.erro).join(', ') || 'Erro desconhecido';
      throw new Error(`Erro da API Tiny: ${erros}`);
    }

    // Verificar se o pedido foi encontrado
    if (!tinyData.retorno.pedido) {
      throw new Error('Pedido não encontrado');
    }

    const pedidoDetalhes = tinyData.retorno.pedido;
    console.log('Pedido encontrado:', pedidoDetalhes.numero);

    // Calcular totais dos itens
    const itensDetalhados = pedidoDetalhes.itens?.map(itemWrapper => {
      const item = itemWrapper.item;
      return {
        codigo: item.codigo,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        valor_total: item.valor_total
      };
    }) || [];

    const totalItens = itensDetalhados.reduce((sum, item) => sum + item.quantidade, 0);

    // Estruturar resposta
    const pedidoCompleto = {
      id: pedidoDetalhes.id,
      numero: pedidoDetalhes.numero,
      numero_ecommerce: pedidoDetalhes.numero_ecommerce,
      data_pedido: pedidoDetalhes.data_pedido,
      data_prevista: pedidoDetalhes.data_prevista,
      situacao: pedidoDetalhes.situacao,
      codigo_rastreamento: pedidoDetalhes.codigo_rastreamento,
      url_rastreamento: pedidoDetalhes.url_rastreamento,
      cliente: {
        nome: pedidoDetalhes.cliente.nome,
        cpf_cnpj: pedidoDetalhes.cliente.cpf_cnpj,
        endereco: pedidoDetalhes.cliente.endereco,
        bairro: pedidoDetalhes.cliente.bairro,
        cidade: pedidoDetalhes.cliente.cidade,
        uf: pedidoDetalhes.cliente.uf,
        cep: pedidoDetalhes.cliente.cep,
        telefone: pedidoDetalhes.cliente.telefone,
        email: pedidoDetalhes.cliente.email
      },
      itens: itensDetalhados,
      resumo: {
        total_itens: totalItens,
        valor_produtos: itensDetalhados.reduce((sum, item) => sum + item.valor_total, 0),
        valor_frete: pedidoDetalhes.valor_frete,
        valor_desconto: pedidoDetalhes.valor_desconto,
        valor_total: pedidoDetalhes.valor_total
      },
      obs: pedidoDetalhes.obs,
      obs_interna: pedidoDetalhes.obs_interna
    };

    console.log('Detalhes do pedido processados com sucesso');

    return new Response(JSON.stringify({
      pedido: pedidoCompleto,
      message: 'Detalhes do pedido obtidos com sucesso'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro ao obter detalhes do pedido:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      message: 'Erro ao obter detalhes do pedido do Tiny ERP' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
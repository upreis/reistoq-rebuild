import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TinyPedido {
  id: string;
  numero: string;
  numero_ecommerce?: string;
  data_pedido: string;
  data_prevista?: string;
  situacao: string;
  codigo_rastreamento?: string;
  url_rastreamento?: string;
  nome_cliente: string;
  cpf_cnpj?: string;
  valor_frete: number;
  valor_desconto: number;
  valor_total: number;
  obs?: string;
  obs_interna?: string;
}

interface TinyItemPedido {
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  ncm?: string;
  codigo_barras?: string;
  observacoes?: string;
}

interface TinyApiResponse {
  retorno: {
    status: string;
    codigo_erro?: number;
    erros?: Array<{ erro: string }>;
    pedidos?: Array<{
      pedido: {
        id?: string;
        numero?: string;
        numero_ecommerce?: string;
        data_pedido?: string;
        data_prevista?: string;
        situacao?: string;
        codigo_rastreamento?: string;
        url_rastreamento?: string;
        cliente?: {
          nome?: string;
          cpf_cnpj?: string;
        };
        nome_cliente?: string; // Fallback se cliente.nome não existir
        cpf_cnpj?: string; // Fallback se cliente.cpf_cnpj não existir
        valor_frete?: string | number;
        valor_desconto?: string | number;
        total_pedido?: string | number;
        valor_total?: string | number;
        obs?: string;
        obs_interna?: string;
        [key: string]: any; // Para propriedades adicionais
      }
    }>;
    numero_paginas?: number;
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

    // Buscar configurações do Tiny ERP
    const { data: configs } = await supabaseClient
      .from('configuracoes')
      .select('chave, valor')
      .in('chave', ['tiny_token', 'tiny_api_url']);

    const tinyToken = configs?.find(c => c.chave === 'tiny_token')?.valor;
    const tinyApiUrl = configs?.find(c => c.chave === 'tiny_api_url')?.valor || 'https://api.tiny.com.br/api2';

    if (!tinyToken) {
      throw new Error('Token do Tiny ERP não configurado');
    }

    // Parâmetros da requisição
    const { filtros = {}, pagina = 1 } = await req.json().catch(() => ({}));
    
    console.log('Iniciando sincronização de pedidos com Tiny ERP');
    console.log('Filtros:', filtros);

    // Parâmetros para a API do Tiny
    const params = new URLSearchParams({
      token: tinyToken,
      formato: 'JSON',
      pagina: pagina.toString()
    });

    // Aplicar filtros se fornecidos
    if (filtros.dataInicio) {
      params.append('dataInicio', filtros.dataInicio);
    }
    if (filtros.dataFim) {
      params.append('dataFim', filtros.dataFim);
    }
    if (filtros.situacao && filtros.situacao !== 'todas') {
      params.append('situacao', filtros.situacao);
    }

    // Fazer requisição para a API do Tiny
    const tinyResponse = await fetch(`${tinyApiUrl}/pedidos.pesquisa.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params
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

    // Verificar se há pedidos
    if (!tinyData.retorno.pedidos || tinyData.retorno.pedidos.length === 0) {
      console.log('Nenhum pedido encontrado');
      return new Response(JSON.stringify({ 
        pedidos: [], 
        total: 0,
        paginas: 0,
        message: 'Nenhum pedido encontrado'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Processar pedidos para o formato do banco
    const pedidosProcessados: Partial<TinyPedido>[] = [];
    
    for (const item of tinyData.retorno.pedidos) {
      const pedido = item.pedido;
      
      // Log para debug da estrutura
      console.log('Estrutura do pedido:', JSON.stringify(pedido, null, 2));
      
      try {
        const pedidoProcessado = {
          numero: pedido.numero || '',
          numero_ecommerce: pedido.numero_ecommerce || null,
          nome_cliente: pedido.cliente?.nome || pedido.nome_cliente || 'Cliente não informado',
          cpf_cnpj: pedido.cliente?.cpf_cnpj || pedido.cpf_cnpj || null,
          data_pedido: pedido.data_pedido || new Date().toISOString().split('T')[0],
          data_prevista: pedido.data_prevista || null,
          valor_total: parseFloat(String(pedido.total_pedido || pedido.valor_total || '0').replace(',', '.')) || 0,
          valor_frete: parseFloat(String(pedido.valor_frete || '0').replace(',', '.')) || 0,
          valor_desconto: parseFloat(String(pedido.valor_desconto || '0').replace(',', '.')) || 0,
          situacao: (pedido.situacao || 'pendente').toLowerCase(),
          obs: pedido.obs || null,
          obs_interna: pedido.obs_interna || null,
          codigo_rastreamento: pedido.codigo_rastreamento || null,
          url_rastreamento: pedido.url_rastreamento || null
        };
        
        pedidosProcessados.push(pedidoProcessado);
      } catch (itemError) {
        console.error('Erro ao processar pedido individual:', pedido.numero, itemError);
        continue; // Pula este pedido e continua com os próximos
      }
    }

    console.log(`Processando ${pedidosProcessados.length} pedidos`);

    // Função para buscar itens detalhados do pedido
    const buscarItensPedido = async (numeroPedido: string): Promise<TinyItemPedido[]> => {
      try {
        const paramsDetalhe = new URLSearchParams({
          token: tinyToken,
          formato: 'JSON',
          id: numeroPedido
        });

        const detalheResponse = await fetch(`${tinyApiUrl}/pedido.obter.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: paramsDetalhe
        });

        if (!detalheResponse.ok) {
          console.error(`Erro ao buscar detalhes do pedido ${numeroPedido}:`, detalheResponse.status);
          return [];
        }

        const detalheData = await detalheResponse.json();
        
        if (detalheData.retorno.status === 'Erro') {
          console.error(`Erro ao buscar detalhes do pedido ${numeroPedido}:`, detalheData.retorno.erros);
          return [];
        }

        const pedidoCompleto = detalheData.retorno.pedido;
        const itens = pedidoCompleto.itens || [];

        return itens.map((item: any) => ({
          codigo: item.item?.codigo || '',
          descricao: item.item?.descricao || '',
          unidade: item.item?.unidade || 'UN',
          quantidade: parseFloat(String(item.item?.quantidade || '0').replace(',', '.')) || 0,
          valor_unitario: parseFloat(String(item.item?.valor_unitario || '0').replace(',', '.')) || 0,
          valor_total: parseFloat(String(item.item?.valor_total || '0').replace(',', '.')) || 0,
          ncm: item.item?.ncm || null,
          codigo_barras: item.item?.codigo_barras || null,
          observacoes: item.item?.observacoes || null
        }));
      } catch (error) {
        console.error(`Erro ao buscar itens do pedido ${numeroPedido}:`, error);
        return [];
      }
    };

    // Inserir/atualizar pedidos no banco e buscar itens
    for (const pedido of pedidosProcessados) {
      try {
        // Salvar pedido
        const { data: pedidoSalvo, error: errorPedido } = await supabaseClient
          .from('pedidos')
          .upsert(pedido, { 
            onConflict: 'numero',
            ignoreDuplicates: false 
          })
          .select()
          .single();

        if (errorPedido) {
          console.error('Erro ao salvar pedido:', pedido.numero, errorPedido);
          continue;
        }

        // Buscar itens detalhados do pedido
        const itens = await buscarItensPedido(pedido.numero);
        
        if (itens.length > 0) {
          // Preparar itens para inserção
          const itensParaInserir = itens.map(item => ({
            pedido_id: pedidoSalvo.id,
            numero_pedido: pedido.numero,
            sku: item.codigo,
            descricao: item.descricao,
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario,
            valor_total: item.valor_total,
            ncm: item.ncm,
            codigo_barras: item.codigo_barras,
            observacoes: item.observacoes
          }));

          // Inserir itens do pedido
          const { error: errorItens } = await supabaseClient
            .from('itens_pedidos')
            .upsert(itensParaInserir, { 
              onConflict: 'numero_pedido,sku',
              ignoreDuplicates: false 
            });

          if (errorItens) {
            console.error('Erro ao salvar itens do pedido:', pedido.numero, errorItens);
          } else {
            console.log(`Salvos ${itens.length} itens para o pedido ${pedido.numero}`);
          }
        }
      } catch (error) {
        console.error('Erro ao processar pedido completo:', pedido.numero, error);
      }
    }

    console.log('Sincronização concluída com sucesso');

    return new Response(JSON.stringify({
      pedidos: pedidosProcessados,
      total: pedidosProcessados.length,
      paginas: tinyData.retorno.numero_paginas || 1,
      message: `${pedidosProcessados.length} pedidos sincronizados com sucesso`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na sincronização:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      message: 'Erro ao sincronizar pedidos com Tiny ERP' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
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

    console.log('🚀 Iniciando sincronização básica de pedidos...')

    // Buscar token do Tiny das configurações
    const { data: config, error: configError } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'tiny_token')
      .single()

    if (configError || !config?.valor) {
      console.error('Token do Tiny não encontrado')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token do Tiny ERP não configurado' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    const tinyToken = config.valor
    
    // Buscar pedidos dos últimos 7 dias
    const inicio = new Date()
    inicio.setDate(inicio.getDate() - 7)
    const hoje = new Date()

    const fmt = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, '0')
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const yyyy = d.getFullYear()
      return `${dd}/${mm}/${yyyy}`
    }

    const dataInicialStr = fmt(inicio)
    const dataFinalStr = fmt(hoje)

    console.log(`📅 Buscando pedidos desde: ${dataInicialStr} até ${dataFinalStr}`)

    // Fazer request para API do Tiny
    const tinyResponse = await fetch('https://api.tiny.com.br/api2/pedidos.pesquisa.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `token=${tinyToken}&formato=json&dataInicial=${encodeURIComponent(dataInicialStr)}&dataFinal=${encodeURIComponent(dataFinalStr)}`
    })

    const tinyData = await tinyResponse.json()
    console.log('📦 Resposta do Tiny:', JSON.stringify(tinyData, null, 2))

    if (tinyData.retorno?.status !== 'OK') {
      const errorMsg = tinyData.retorno?.erros?.[0]?.erro || 'Erro desconhecido'
      throw new Error(`Erro do Tiny ERP: ${errorMsg}`)
    }

    const pedidosTiny = tinyData.retorno?.pedidos || []
    console.log(`📋 Encontrados ${pedidosTiny.length} pedidos`)

    let novos = 0
    let atualizados = 0
    let erros = 0

    // Processar cada pedido
    for (const pedidoWrapper of pedidosTiny) {
      try {
        const pedido = pedidoWrapper.pedido

        // Verificar se pedido já existe
        const { data: pedidoExistente } = await supabase
          .from('pedidos')
          .select('id')
          .eq('numero', pedido.numero)
          .single()

        const pedidoData = {
          numero: pedido.numero,
          numero_ecommerce: pedido.numero_ecommerce || null,
          nome_cliente: pedido.nome_cliente || '',
          cpf_cnpj: pedido.cpf_cnpj || '',
          data_pedido: pedido.data_pedido,
          data_prevista: pedido.data_prevista || null,
          valor_total: parseFloat(pedido.valor_total || '0'),
          valor_frete: parseFloat(pedido.valor_frete || '0'),
          valor_desconto: parseFloat(pedido.valor_desconto || '0'),
          situacao: pedido.situacao || '',
          obs: pedido.obs || null,
          obs_interna: pedido.obs_interna || null,
          cidade: pedido.cidade || null,
          uf: pedido.uf || null,
          codigo_rastreamento: pedido.codigo_rastreamento || null,
          url_rastreamento: pedido.url_rastreamento || null,
          updated_at: new Date().toISOString()
        }

        if (pedidoExistente) {
          // Atualizar pedido existente
          const { error: updateError } = await supabase
            .from('pedidos')
            .update(pedidoData)
            .eq('numero', pedido.numero)

          if (updateError) {
            console.error(`Erro ao atualizar pedido ${pedido.numero}:`, updateError)
            erros++
          } else {
            atualizados++
          }
        } else {
          // Inserir novo pedido
          const { error: insertError } = await supabase
            .from('pedidos')
            .insert({
              id: pedido.numero, // Usar número como ID
              ...pedidoData,
              created_at: new Date().toISOString()
            })

          if (insertError) {
            console.error(`Erro ao inserir pedido ${pedido.numero}:`, insertError)
            erros++
          } else {
            novos++
          }
        }

        // Buscar itens do pedido
        const tinyItensResponse = await fetch('https://api.tiny.com.br/api2/pedido.obter.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `token=${tinyToken}&id=${pedido.id}&formato=json`
        })

        const tinyItensData = await tinyItensResponse.json()
        
        if (tinyItensData.retorno?.status === 'OK' && tinyItensData.retorno?.pedido?.itens) {
          const itens = tinyItensData.retorno.pedido.itens

          for (const itemWrapper of itens) {
            const item = itemWrapper.item

            // Verificar se item já existe
            const { data: itemExistente } = await supabase
              .from('itens_pedidos')
              .select('id')
              .eq('pedido_id', pedido.numero)
              .eq('sku', item.codigo)
              .single()

            const itemData = {
              pedido_id: pedido.numero,
              numero_pedido: pedido.numero,
              sku: item.codigo,
              descricao: item.descricao || '',
              quantidade: parseInt(item.quantidade || '0'),
              valor_unitario: parseFloat(item.valor_unitario || '0'),
              valor_total: parseFloat(item.valor_total || '0'),
              ncm: item.ncm || null,
              codigo_barras: item.gtin || null,
              updated_at: new Date().toISOString()
            }

            if (!itemExistente) {
              // Inserir novo item
              await supabase
                .from('itens_pedidos')
                .insert({
                  ...itemData,
                  created_at: new Date().toISOString()
                })
            }
          }
        }

      } catch (itemError) {
        console.error('Erro ao processar pedido:', itemError)
        erros++
      }
    }

    const resultado = {
      success: true,
      resumo: {
        total_processados: pedidosTiny.length,
        novos,
        atualizados,
        erros
      },
      message: `Sincronização concluída: ${novos} novos, ${atualizados} atualizados, ${erros} erros`
    }

    console.log('✅ Sincronização concluída:', resultado)

    return new Response(
      JSON.stringify(resultado),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Erro na sincronização:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro interno do servidor'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
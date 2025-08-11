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
    const requestId = crypto.randomUUID();

    // Supabase client com JWT do chamador (RLS)
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });

    // Buscar token do Tiny nas Configurações
    const { data: cfg, error: cfgErr } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'tiny_token')
      .single();

    if (cfgErr || !cfg?.valor) {
      console.error('Token Tiny ERP não configurado nas Configurações');
      return new Response(
        JSON.stringify({ success: false, error: 'Token Tiny ERP não configurado nas Configurações', requestId }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } }
      );
    }

    const tinyToken = cfg.valor as string;
    console.log('Testando conexão com Tiny ERP...', { requestId });

    // Testar conexão com API do Tiny - endpoint de info da empresa
    const tinyResponse = await fetch('https://api.tiny.com.br/api2/info.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `token=${tinyToken}&formato=json`
    })

    const tinyData = await tinyResponse.json()
    console.log('Resposta do Tiny:', tinyData)

    if (tinyData.retorno?.status === 'OK') {
      // Sucesso - extrair informações da empresa
      const empresa = tinyData.retorno?.empresa || {}
      
return new Response(
        JSON.stringify({
          success: true,
          empresa: {
            nome: empresa.nome || 'Não informado',
            cnpj: empresa.cnpj || 'Não informado',
            cidade: empresa.cidade || 'Não informado',
            uf: empresa.uf || 'Não informado'
          },
          message: 'Conexão com Tiny ERP estabelecida com sucesso!',
          requestId
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId },
          status: 200 
        }
      )
    } else {
      // Erro na API do Tiny
      const errorMsg = tinyData.retorno?.erros?.[0]?.erro || 'Erro desconhecido'
      console.error('Erro na API do Tiny:', errorMsg)
      
return new Response(
        JSON.stringify({
          success: false,
          error: `Erro do Tiny ERP: ${errorMsg}`,
          requestId
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId },
          status: 400 
        }
      )
    }

  } catch (error) {
    console.error('Erro ao testar conexão com Tiny:', error)
return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro interno do servidor ao conectar com Tiny ERP',
        requestId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId },
        status: 500 
      }
    )
  }
})
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SkuRequest {
  sku_pedido: string;
  observacoes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sku_pedido, observacoes }: SkuRequest = await req.json();

    if (!sku_pedido) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'SKU do pedido é obrigatório' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log(`Verificando se SKU ${sku_pedido} já está mapeado...`);

    // Verificar se o SKU já existe no mapeamento
    const { data: existingMapping, error: searchError } = await supabase
      .from('mapeamentos_depara')
      .select('id, sku_correspondente')
      .eq('sku_pedido', sku_pedido)
      .single();

    if (searchError && searchError.code !== 'PGRST116') {
      console.error('Erro ao buscar mapeamento existente:', searchError);
      throw searchError;
    }

    if (existingMapping) {
      console.log(`SKU ${sku_pedido} já está mapeado`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'SKU já está mapeado',
          existing: true,
          mapping: existingMapping
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // SKU não existe, criar novo mapeamento pendente
    console.log(`Criando novo mapeamento pendente para SKU ${sku_pedido}...`);
    
    const { data: newMapping, error: insertError } = await supabase
      .from('mapeamentos_depara')
      .insert({
        sku_pedido: sku_pedido,
        sku_correspondente: null, // Pendente de preenchimento
        quantidade: 1, // Quantidade padrão
        ativo: true,
        observacoes: observacoes || `SKU inserido automaticamente em ${new Date().toLocaleString('pt-BR')}`
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir novo mapeamento:', insertError);
      throw insertError;
    }

    console.log(`Novo mapeamento criado com sucesso:`, newMapping);

    // Verificar se alertas em tempo real estão habilitados
    const { data: alertasConfig } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'alertas_automaticos_depara')
      .single();

    const { data: intervalConfig } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'intervalo_alertas_depara')
      .single();

    const alertasHabilitados = alertasConfig?.valor === 'true';
    const intervaloMinutos = parseInt(intervalConfig?.valor || '60');

    // Se alertas em tempo real estão habilitados (intervalo = 0), enviar alerta imediatamente
    if (alertasHabilitados && intervaloMinutos === 0) {
      console.log('Enviando alerta em tempo real para novo SKU pendente...');
      
      try {
        const { data: alertaResponse } = await supabase.functions.invoke('alertas-depara');
        console.log('Alerta em tempo real enviado:', alertaResponse);
      } catch (alertError) {
        console.error('Erro ao enviar alerta em tempo real:', alertError);
        // Não falhar a inserção por causa do alerta
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Novo mapeamento pendente criado com sucesso',
        existing: false,
        mapping: newMapping,
        alerta_enviado: alertasHabilitados && intervaloMinutos === 0
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Erro na função auto-mapear-sku:', error);
    
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
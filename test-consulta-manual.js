import { supabase } from "@/integrations/supabase/client";

// Função para testar a consulta do pedido 2874
async function consultarPedido2874() {
  try {
    console.log('Consultando pedido 2874...');
    
    const { data, error } = await supabase.functions.invoke('obter-pedido-tiny', {
      body: { numeroPedido: '2874' }
    });

    if (error) {
      console.error('Erro na função:', error);
      return;
    }

    console.log('=== RESULTADO COMPLETO DA CONSULTA ===');
    console.log('Dados completos do pedido 2874:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.pedido) {
      console.log('\n=== ANÁLISE DOS CAMPOS DISPONÍVEIS ===');
      console.log('Campos do pedido principal:', Object.keys(data.pedido));
      if (data.pedido.cliente) {
        console.log('Campos do cliente:', Object.keys(data.pedido.cliente));
      }
      if (data.pedido.itens && data.pedido.itens.length > 0) {
        console.log('Campos dos itens:', Object.keys(data.pedido.itens[0]));
      }
      if (data.pedido.resumo) {
        console.log('Campos do resumo:', Object.keys(data.pedido.resumo));
      }
    }
    
  } catch (error) {
    console.error('Erro na consulta:', error);
  }
}

// Executar a consulta
consultarPedido2874();
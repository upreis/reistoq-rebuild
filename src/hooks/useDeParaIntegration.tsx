import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface MapeamentoItem {
  id: string;
  sku_pedido: string;
  sku_correspondente?: string;
  sku_simples?: string;
  quantidade: number;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ItemPedidoEnriquecido {
  id: string;
  pedido_id: string;
  numero_pedido: string;
  sku: string;
  sku_estoque?: string; // SKU traduzido pelo DE/PARA
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  ncm?: string;
  codigo_barras?: string;
  observacoes?: string;
  empresa?: string;
  numero_venda?: string;
  linha_destacada?: boolean; // Quando não tem mapeamento
  mapeamento_aplicado?: MapeamentoItem;
  // Campos do pedido principal
  nome_cliente?: string;
  numero_ecommerce?: string;
  data_pedido?: string;
  data_prevista?: string;
  situacao?: string;
  cpf_cnpj?: string;
  cidade?: string;
  uf?: string;
  codigo_rastreamento?: string;
  url_rastreamento?: string;
  valor_frete?: number;
  valor_desconto?: number;
  // ✅ VALOR TOTAL DO PEDIDO COMPLETO
  valor_total_pedido?: number;
  valor_frete_pedido?: number;
  valor_desconto_pedido?: number;
  obs?: string;
  obs_interna?: string;
  // ✅ NOVAS COLUNAS SOLICITADAS
  canal_venda?: string;
  nome_ecommerce?: string;
  // ✅ CAMPOS PARA BAIXA DE ESTOQUE
  sku_kit?: string;
  qtd_kit?: number;
  // Campos do estoque
  produto_nome?: string;
  estoque_atual?: number;
  ja_processado?: boolean;
}

export function useDeParaIntegration() {
  const [mapeamentos, setMapeamentos] = useState<MapeamentoItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Carregar mapeamentos
  const carregarMapeamentos = async () => {
    try {
      setLoading(true);
      
      // Cache check - avoid unnecessary API calls
      const cached = sessionStorage.getItem('mapeamentos-cache');
      const cacheTime = sessionStorage.getItem('mapeamentos-cache-time');
      if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < 300000) { // 5 min cache
        setMapeamentos(JSON.parse(cached));
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('mapeamentos_depara')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappings = data || [];
      setMapeamentos(mappings);
      
      // Cache the results
      sessionStorage.setItem('mapeamentos-cache', JSON.stringify(mappings));
      sessionStorage.setItem('mapeamentos-cache-time', Date.now().toString());
    } catch (error) {
      console.error('Erro ao carregar mapeamentos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar mapeamentos DE/PARA",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Obter mapeamento para um SKU específico
  const obterMapeamento = (skuPedido: string): MapeamentoItem | undefined => {
    return mapeamentos.find(item => 
      item.sku_pedido === skuPedido && item.ativo
    );
  };

  // Enriquecer itens de pedidos com dados do DE/PARA
  const enriquecerItensPedidos = (itens: any[]): ItemPedidoEnriquecido[] => {
    return itens.map(item => {
      const mapeamento = obterMapeamento(item.sku);
      
      return {
        ...item,
        sku_estoque: mapeamento?.sku_correspondente || item.sku,
        linha_destacada: !mapeamento,
        mapeamento_aplicado: mapeamento,
      };
    });
  };

  // Verificar se um item tem mapeamento
  const temMapeamento = (skuPedido: string): boolean => {
    return !!obterMapeamento(skuPedido);
  };

  // Obter estatísticas de mapeamento para uma lista de itens
  const obterEstatisticasMapeamento = (itens: any[]) => {
    const totalItens = itens.length;
    const itensMapeados = itens.filter(item => temMapeamento(item.sku)).length;
    const itensNaoMapeados = totalItens - itensMapeados;
    const percentualMapeado = totalItens > 0 ? (itensMapeados / totalItens) * 100 : 0;

    return {
      totalItens,
      itensMapeados,
      itensNaoMapeados,
      percentualMapeado: Math.round(percentualMapeado)
    };
  };

  useEffect(() => {
    carregarMapeamentos();

    // Subscription para atualizações em tempo real
    const subscription = supabase
      .channel('mapeamentos_depara_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mapeamentos_depara'
      }, () => {
        carregarMapeamentos();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    mapeamentos,
    loading,
    obterMapeamento,
    enriquecerItensPedidos,
    temMapeamento,
    obterEstatisticasMapeamento,
    recarregarMapeamentos: carregarMapeamentos
  };
}
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAutoMapearSku() {
  const { toast } = useToast();

  const inserirSkuAutomaticamente = useCallback(async (
    skuPedido: string, 
    observacoes?: string,
    prioridade: 'baixa' | 'normal' | 'alta' | 'urgente' = 'normal'
  ) => {
    try {
      console.log(`Verificando auto-inserção para SKU: ${skuPedido}`);

      const response = await supabase.functions.invoke('auto-mapear-sku', {
        body: {
          sku_pedido: skuPedido,
          observacoes: observacoes || `SKU inserido automaticamente de pedido em ${new Date().toLocaleString('pt-BR')}`,
          prioridade
        }
      });

      if (response.error) {
        throw response.error;
      }

      const result = response.data;

      if (result.success && !result.existing) {
        toast({
          title: 'SKU Inserido Automaticamente',
          description: `SKU ${skuPedido} foi adicionado ao mapeamento DePara e aguarda preenchimento`,
        });

        return {
          inserted: true,
          mapping: result.mapping,
          alertaSent: result.alerta_enviado
        };
      } else if (result.existing) {
        console.log(`SKU ${skuPedido} já existe no mapeamento`);
        return {
          inserted: false,
          existing: true,
          mapping: result.mapping
        };
      }

      return { inserted: false };
    } catch (error: any) {
      console.error('Erro ao inserir SKU automaticamente:', error);
      toast({
        title: 'Erro na Auto-inserção',
        description: error.message || 'Erro ao inserir SKU automaticamente no DePara',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  const verificarEInserirSkusPedido = useCallback(async (
    itensPedido: Array<{ sku: string; descricao?: string }>,
    prioridadePedido: 'baixa' | 'normal' | 'alta' | 'urgente' = 'alta'
  ) => {
    try {
      const resultados = [];

      for (const item of itensPedido) {
        const resultado = await inserirSkuAutomaticamente(
          item.sku,
          `Auto-inserido do pedido: ${item.descricao || 'Sem descrição'}`,
          prioridadePedido
        );
        resultados.push({
          sku: item.sku,
          ...resultado
        });
      }

      const skusInseridos = resultados.filter(r => r.inserted);
      
      if (skusInseridos.length > 0) {
        toast({
          title: 'SKUs do Pedido Processados',
          description: `${skusInseridos.length} SKU(s) inserido(s) no DePara para mapeamento`,
        });
      }

      return resultados;
    } catch (error: any) {
      console.error('Erro ao verificar SKUs do pedido:', error);
      return [];
    }
  }, [inserirSkuAutomaticamente, toast]);

  const atualizarPrioridade = useCallback(async (
    mapeamentoId: string,
    novaPrioridade: 'baixa' | 'normal' | 'alta' | 'urgente'
  ) => {
    try {
      const { error } = await supabase
        .from('mapeamentos_depara')
        .update({ 
          prioridade: novaPrioridade,
          data_mapeamento: new Date().toISOString()
        })
        .eq('id', mapeamentoId);

      if (error) throw error;

      toast({
        title: 'Prioridade Atualizada',
        description: `Prioridade alterada para ${novaPrioridade}`,
      });

      return true;
    } catch (error: any) {
      console.error('Erro ao atualizar prioridade:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar prioridade do mapeamento',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  const incrementarPedidosAguardando = useCallback(async (skuPedido: string) => {
    try {
      const { data: mapeamento } = await supabase
        .from('mapeamentos_depara')
        .select('id, pedidos_aguardando')
        .eq('sku_pedido', skuPedido)
        .maybeSingle();

      if (mapeamento) {
        const { error } = await supabase
          .from('mapeamentos_depara')
          .update({ 
            pedidos_aguardando: (mapeamento.pedidos_aguardando || 0) + 1
          })
          .eq('id', mapeamento.id);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Erro ao incrementar pedidos aguardando:', error);
    }
  }, []);

  return {
    inserirSkuAutomaticamente,
    verificarEInserirSkusPedido,
    atualizarPrioridade,
    incrementarPedidosAguardando
  };
}
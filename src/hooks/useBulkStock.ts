import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { orderService } from '@/services/OrderService';
import type { OrderItem, BulkStockItem, BulkResult } from '@/types/orders';

export function useBulkStock() {
  const [processing, setProcessing] = useState(false);
  const [stockLevels, setStockLevels] = useState<Record<string, number>>({});

  // Verificar estoque disponível
  const checkStockLevels = useCallback(async (items: OrderItem[]) => {
    if (items.length === 0) return {};

    try {
      const skusToCheck = items
        .map(item => item.sku_kit || item.sku)
        .filter(Boolean);

      if (skusToCheck.length === 0) return {};

      const { data: produtos } = await supabase
        .from('produtos')
        .select('sku_interno, quantidade_atual')
        .in('sku_interno', skusToCheck);

      const stockMap: Record<string, number> = {};
      produtos?.forEach(produto => {
        stockMap[produto.sku_interno] = produto.quantidade_atual || 0;
      });

      setStockLevels(stockMap);
      return stockMap;
    } catch (error) {
      console.error('Erro ao verificar estoque:', error);
      return {};
    }
  }, []);

  // Obter status do estoque para um item
  const getStockStatus = useCallback((item: OrderItem): 'disponivel' | 'sem-estoque' | 'sem-mapeamento' | 'processado' | 'processando' => {
    if (item.ja_processado) return 'processado';
    if (processing) return 'processando';

    const skuProduto = item.sku_kit || item.sku;
    if (!skuProduto) return 'sem-mapeamento';

    const estoqueAtual = stockLevels[skuProduto] || 0;
    const quantidadeNecessaria = (item.qtd_kit || 1) * item.quantidade;

    return estoqueAtual >= quantidadeNecessaria ? 'disponivel' : 'sem-estoque';
  }, [stockLevels, processing]);

  // Filtrar itens elegíveis para baixa
  const getEligibleItems = useCallback((items: OrderItem[]): OrderItem[] => {
    return items.filter(item => {
      const temSkuKit = item.sku_kit || item.sku;
      const temQuantidade = item.qtd_kit && item.qtd_kit > 0;
      
      // Situações que permitem baixa de estoque
      const situacaoLower = item.situacao?.toLowerCase() || '';
      const situacoesBaixarEstoque = [
        'aprovado', 
        'preparando envio', 
        'faturado', 
        'pronto para envio',
        'em separacao',
        'entregue'
      ];
      
      const situacaoValida = situacoesBaixarEstoque.includes(situacaoLower);
      const naoProcessado = !item.ja_processado;
      const temEstoque = getStockStatus(item) === 'disponivel';
      
      return temSkuKit && (temQuantidade || item.quantidade > 0) && 
             situacaoValida && naoProcessado && temEstoque;
    });
  }, [getStockStatus]);

  // Executar baixa de estoque em lote (com dry-run)
  const processBulkStock = useCallback(async (
    items: OrderItem[], 
    dryRun: boolean = false
  ): Promise<BulkResult> => {
    if (processing) {
      throw new Error('Processamento já em andamento');
    }

    try {
      setProcessing(true);

      const eligibleItems = getEligibleItems(items);
      
      if (eligibleItems.length === 0) {
        const message = items.some(item => getStockStatus(item) === 'sem-estoque') 
          ? 'Nenhum item tem estoque suficiente'
          : 'Nenhum item elegível para baixa de estoque';
          
        toast({
          title: 'Aviso',
          description: message,
          variant: 'destructive'
        });
        
        return { success: false, processados: 0, erros: [] };
      }

      // Preparar payload
      const bulkItems: BulkStockItem[] = eligibleItems.map(item => ({
        id: item.id,
        numero_pedido: item.numero_pedido,
        sku_pedido: item.sku,
        sku_kit: item.sku_kit || item.sku,
        quantidade_kit: (item.qtd_kit || 1) * item.quantidade,
        quantidade_pedido: item.quantidade,
        qtd_kit: item.qtd_kit || 1,
        descricao: item.descricao,
        nome_cliente: item.nome_cliente,
        data_pedido: item.data_pedido,
        valor_unitario: item.valor_unitario,
        valor_total: item.valor_total
      }));

      if (dryRun) {
        // Simular processamento para validação
        toast({
          title: 'Simulação',
          description: `${eligibleItems.length} itens seriam processados`,
        });
        
        return { 
          success: true, 
          processados: eligibleItems.length, 
          erros: [] 
        };
      }

      // Processamento real
      toast({
        title: 'Processando baixa de estoque',
        description: `Processando ${eligibleItems.length} itens...`
      });

      const result = await orderService.bulkStock({ itens: bulkItems });

      if (result.success) {
        toast({
          title: 'Baixa de estoque concluída',
          description: `${result.processados} itens processados com sucesso`
        });
        
        // Atualizar níveis de estoque após processamento
        await checkStockLevels(items);
      } else {
        toast({
          title: 'Baixa parcialmente concluída',
          description: `${result.processados} processados, ${result.erros.length} erros`,
          variant: 'destructive'
        });
      }

      return result;

    } catch (error: any) {
      console.error('Erro na baixa de estoque:', error);
      toast({
        title: 'Erro na baixa de estoque',
        description: error.message || 'Erro inesperado',
        variant: 'destructive'
      });
      
      return { 
        success: false, 
        processados: 0, 
        erros: [{ id: 'general', motivo: error.message }] 
      };
    } finally {
      setProcessing(false);
    }
  }, [processing, getEligibleItems, getStockStatus, checkStockLevels]);

  return {
    processing,
    stockLevels,
    checkStockLevels,
    getStockStatus,
    getEligibleItems,
    processBulkStock
  };
}
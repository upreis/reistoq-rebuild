import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { 
  ListParams, 
  ListResponse, 
  OrderItem, 
  OrderDetails, 
  BulkPayload, 
  BulkResult 
} from '@/types/orders';
import { 
  safeParseWithIssues, 
  ListParamsSchema, 
  ListResponseSchema,
  BulkPayloadSchema,
  BulkResultSchema,
  OrderDetailsSchema
} from '@/schemas/orders';

class OrderService {
  private static TIMEOUT_MS = 6000;

  // Formatar data DD/MM/YYYY para busca no Tiny
  private formatDateForTiny(date: string): string {
    if (!date) return '';
    if (date.includes('/')) return date;
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  }

  // Converter data ISO para DD/MM/YYYY 
  private convertISOToTiny(isoDate: string): string {
    if (!isoDate || isoDate.includes('/')) return isoDate;
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  }

  // Tentar edge function com timeout, fallback para RPC
  private async tryEdgeFunctionWithFallback<T>(
    functionName: string,
    body: any,
    fallbackQuery: () => Promise<T>
  ): Promise<T> {
    try {
      // Tentar edge function com timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), OrderService.TIMEOUT_MS);

      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
        headers: { signal: controller.signal } as any
      });

      clearTimeout(timeoutId);

      if (error) {
        const isServerError = error.message?.includes('5') || error.status >= 500;
        console.warn(`Edge function ${functionName} failed:`, error);
        
        if (isServerError) {
          console.log(`Server error detected, falling back to RPC`);
          return await fallbackQuery();
        }
        throw error;
      }

      return data;
    } catch (error: any) {
      const isTimeout = error.name === 'AbortError' || error.message?.includes('timeout');
      const isServerError = error.status >= 500;
      
      if (isTimeout || isServerError) {
        console.log(`${isTimeout ? 'Timeout' : 'Server error'} in ${functionName}, falling back to RPC`);
        return await fallbackQuery();
      }
      
      throw error;
    }
  }

  async list(params: ListParams): Promise<ListResponse> {
    // Validar parâmetros
    const validation = safeParseWithIssues(ListParamsSchema, params);
    if (!validation.success) {
      throw new Error(`Parâmetros inválidos: ${validation.issues.map(i => i.message).join(', ')}`);
    }

    const validParams = validation.data;

    // Edge function body
    const edgeBody = {
      filtros: {
        dataInicial: validParams.from ? this.convertISOToTiny(validParams.from) : '',
        dataFinal: validParams.to ? this.convertISOToTiny(validParams.to) : '',
        situacao: validParams.situacoes?.length ? validParams.situacoes : undefined,
        fonte: validParams.fonte,
        busca: validParams.q
      },
      page: validParams.page,
      pageSize: validParams.pageSize
    };

    // Fallback RPC query
    const fallbackQuery = async (): Promise<ListResponse> => {
      console.log('🔄 Using RPC fallback for orders list');
      
      let query = supabase
        .from('itens_pedidos')
        .select(`
          *,
          pedidos!inner (
            numero,
            numero_ecommerce,
            nome_cliente,
            cpf_cnpj,
            cidade,
            uf,
            data_pedido,
            data_prevista,
            situacao,
            codigo_rastreamento,
            url_rastreamento,
            obs,
            obs_interna,
            valor_frete,
            valor_desconto,
            valor_total
          )
        `, { count: 'exact' });

      // Aplicar filtros
      if (validParams.q) {
        query = query.or(
          `numero_pedido.ilike.%${validParams.q}%,` +
          `pedidos.nome_cliente.ilike.%${validParams.q}%,` +
          `sku.ilike.%${validParams.q}%,` +
          `descricao.ilike.%${validParams.q}%`
        );
      }

      if (validParams.from) {
        query = query.filter('pedidos.data_pedido', 'gte', validParams.from);
      }

      if (validParams.to) {
        query = query.filter('pedidos.data_pedido', 'lte', validParams.to);
      }

      if (validParams.situacoes?.length) {
        query = query.filter('pedidos.situacao', 'in', `(${validParams.situacoes.join(',')})`);
      }

      const offset = (validParams.page - 1) * validParams.pageSize;
      const { data, error, count } = await query
        .order(validParams.sort, { 
          ascending: validParams.order === 'asc', 
          referencedTable: validParams.sort === 'data_pedido' ? 'pedidos' : undefined 
        })
        .range(offset, offset + validParams.pageSize - 1);

      if (error) throw error;

      // Transformar dados para o formato esperado
      const items: OrderItem[] = (data || []).map((item: any) => ({
        ...item,
        nome_cliente: item.pedidos?.nome_cliente,
        data_pedido: item.pedidos?.data_pedido,
        situacao: item.pedidos?.situacao,
        valor_frete: item.pedidos?.valor_frete || 0,
        valor_desconto: item.pedidos?.valor_desconto || 0,
        // ... outros campos do pedido
      }));

      return {
        items,
        total: count || 0,
        page: validParams.page,
        pageSize: validParams.pageSize,
        totalPages: Math.ceil((count || 0) / validParams.pageSize)
      };
    };

    return this.tryEdgeFunctionWithFallback(
      'sync-pedidos-rapido',
      edgeBody,
      fallbackQuery
    );
  }

  async details(id: string): Promise<OrderDetails> {
    if (!id) {
      throw new Error('ID do pedido é obrigatório');
    }

    try {
      const { data, error } = await supabase.functions.invoke('obter-pedido-tiny', {
        body: { numeroPedido: id }
      });

      if (error) throw error;

      // Validar resposta
      const validation = safeParseWithIssues(OrderDetailsSchema, data);
      if (!validation.success) {
        throw new Error('Resposta inválida do servidor');
      }

      return validation.data;
    } catch (error: any) {
      console.error('Erro ao obter detalhes do pedido:', error);
      throw new Error(error.message || 'Erro ao carregar detalhes do pedido');
    }
  }

  async bulkStock(payload: BulkPayload): Promise<BulkResult> {
    // Validar payload
    const validation = safeParseWithIssues(BulkPayloadSchema, payload);
    if (!validation.success) {
      throw new Error(`Payload inválido: ${validation.issues.map(i => i.message).join(', ')}`);
    }

    try {
      const { data, error } = await supabase.functions.invoke('processar-baixa-estoque', {
        body: validation.data
      });

      if (error) throw error;

      // Validar resposta
      const resultValidation = safeParseWithIssues(BulkResultSchema, data);
      if (!resultValidation.success) {
        throw new Error('Resposta inválida do servidor');
      }

      return resultValidation.data;
    } catch (error: any) {
      console.error('Erro na baixa de estoque:', error);
      throw new Error(error.message || 'Erro ao processar baixa de estoque');
    }
  }

  async exportCsv(params: ListParams): Promise<Blob> {
    // Para até 5k linhas, fazer export client-side
    if (!params.pageSize || params.pageSize <= 5000) {
      const allData = await this.list({ 
        ...params, 
        pageSize: 5000, 
        page: 1 
      });

      const csvContent = this.generateCsv(allData.items);
      return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    }

    // Para mais de 5k, chamar endpoint server-side (TODO: implementar)
    throw new Error('Export de mais de 5000 linhas ainda não implementado');
  }

  private generateCsv(items: OrderItem[]): string {
    const headers = [
      'Pedido',
      'Cliente', 
      'SKU Pedido',
      'Descrição',
      'Qtd',
      'Valor Unit.',
      'Total',
      'Numero da Venda',
      'SKU Estoque',
      'SKU KIT',
      'QTD KIT',
      'Situação',
      'Data'
    ];

    const rows = items.map(item => [
      item.numero_pedido,
      item.nome_cliente,
      item.sku,
      item.descricao,
      item.quantidade.toString(),
      this.formatCurrency(item.valor_unitario),
      this.formatCurrency(item.valor_total),
      item.numero_venda || '',
      item.sku_correspondente || '',
      item.sku_kit || '',
      item.qtd_kit?.toString() || '',
      item.situacao,
      this.formatDate(item.data_pedido)
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return '\ufeff' + csvContent; // BOM para UTF-8
  }

  private formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).replace(',', '.');
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  }
}

export const orderService = new OrderService();
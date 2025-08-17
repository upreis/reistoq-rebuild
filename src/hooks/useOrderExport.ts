import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { orderService } from '@/services/OrderService';
import type { ListParams } from '@/types/orders';

export function useOrderExport() {
  const [exporting, setExporting] = useState(false);

  const exportToCsv = async (params: ListParams, filename?: string) => {
    try {
      setExporting(true);
      
      // Validar se não vai exportar muitos dados
      if (params.pageSize && params.pageSize > 10000) {
        toast({
          title: 'Limite excedido',
          description: 'Não é possível exportar mais de 10.000 linhas por vez',
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: 'Exportando...',
        description: 'Gerando arquivo CSV...'
      });

      const blob = await orderService.exportCsv(params);
      
      // Download do arquivo
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `pedidos_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export concluído',
        description: 'Arquivo CSV baixado com sucesso'
      });

    } catch (error: any) {
      console.error('Erro no export:', error);
      toast({
        title: 'Erro no export',
        description: error.message || 'Erro ao gerar arquivo CSV',
        variant: 'destructive'
      });
    } finally {
      setExporting(false);
    }
  };

  return {
    exportToCsv,
    exporting
  };
}
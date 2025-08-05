import { Download, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import type { ItemPedidoEnriquecido } from "@/hooks/useDeParaIntegration";

interface PedidosBarraAcoesProps {
  itens: ItemPedidoEnriquecido[];
  obterStatusEstoque?: (item: ItemPedidoEnriquecido) => string;
  processandoBaixaEstoque?: boolean;
  onBaixarEstoqueLote?: (itens: ItemPedidoEnriquecido[]) => void;
}

export function PedidosBarraAcoes({
  itens,
  obterStatusEstoque,
  processandoBaixaEstoque,
  onBaixarEstoqueLote
}: PedidosBarraAcoesProps) {
  
  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  // Filtrar itens elegíveis para baixa de estoque
  const itensElegiveis = itens.filter(item => {
    const status = obterStatusEstoque?.(item);
    return status === 'disponivel';
  });

  const exportarTodos = () => {
    if (itens.length === 0) {
      toast({
        title: "Aviso",
        description: "Não há itens para exportar.",
        variant: "destructive",
      });
      return;
    }

    // Create CSV content
    const headers = ['Pedido', 'Cliente', 'SKU Pedido', 'Descrição', 'Qtd', 'Valor Unit.', 'Total', 'Numero da Venda', 'SKU Estoque', 'SKU KIT', 'QTD KIT', 'Situação', 'Data'];
    const csvContent = [
      headers.join(','),
      ...itens.map(item => [
        item.numero_pedido,
        `"${item.nome_cliente}"`,
        item.sku,
        `"${item.descricao}"`,
        item.quantidade,
        item.valor_unitario,
        item.valor_total,
        `"${item.numero_ecommerce || ''}"`,
        `"${item.mapeamento_aplicado?.sku_correspondente || item.sku_estoque || ''}"`,
        `"${item.mapeamento_aplicado?.sku_simples || ''}"`,
        item.mapeamento_aplicado?.quantidade || '',
        `"${item.situacao}"`,
        formatarData(item.data_pedido)
      ].join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pedidos_completos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Exportação concluída",
      description: `${itens.length} itens exportados para CSV.`,
    });
  };

  const processarBaixaEstoque = () => {
    if (!onBaixarEstoqueLote) return;

    if (itensElegiveis.length === 0) {
      toast({
        title: "Aviso",
        description: "Nenhum item está elegível para baixa de estoque.",
        variant: "destructive",
      });
      return;
    }

    onBaixarEstoqueLote(itensElegiveis);
  };

  if (itens.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Total de pedidos:</span>
              <Badge variant="outline" className="px-3 py-1">
                {itens.length} {itens.length === 1 ? 'item' : 'itens'}
              </Badge>
            </div>
            
            {itensElegiveis.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Prontos para baixar:</span>
                <Badge variant="default" className="px-3 py-1 bg-blue-600">
                  {itensElegiveis.length} {itensElegiveis.length === 1 ? 'item' : 'itens'}
                </Badge>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={exportarTodos}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            
            {itensElegiveis.length > 0 && onBaixarEstoqueLote && (
              <Button 
                variant="default" 
                onClick={processarBaixaEstoque}
                disabled={processandoBaixaEstoque}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <TrendingDown className="mr-2 h-4 w-4" />
                Baixar Estoque ({itensElegiveis.length})
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
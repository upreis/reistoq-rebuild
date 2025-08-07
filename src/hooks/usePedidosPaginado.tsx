import { ItemPedido } from '@/hooks/useItensPedidos';
import { usePaginacao } from '@/hooks/usePaginacao';

interface UsePedidosPaginadoProps {
  pedidos: ItemPedido[];
  itensPorPagina?: number;
}

export function usePedidosPaginado({ pedidos, itensPorPagina = 100 }: UsePedidosPaginadoProps) {
  const {
    itemsPaginados: pedidosPaginados,
    paginaAtual,
    totalPaginas,
    totalItens,
    itemInicial,
    itemFinal,
    irParaPagina,
    proximaPagina,
    paginaAnterior,
  } = usePaginacao({
    items: pedidos,
    itensPorPagina,
    resetWhenItemsChange: true,
  });

  return {
    pedidosPaginados,
    paginaAtual,
    totalPaginas,
    totalItens,
    itemInicial,
    itemFinal,
    irParaPagina,
    proximaPagina,
    paginaAnterior,
  };
}
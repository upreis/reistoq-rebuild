import { useState, useMemo, useEffect } from 'react';
import { Pedido } from '@/hooks/usePedidos';

interface UsePedidosPaginadoProps {
  pedidos: Pedido[];
  itensPorPagina?: number;
}

export function usePedidosPaginado({ pedidos, itensPorPagina = 20 }: UsePedidosPaginadoProps) {
  const [paginaAtual, setPaginaAtual] = useState(1);

  const totalPaginas = Math.ceil(pedidos.length / itensPorPagina);

  const pedidosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    return pedidos.slice(inicio, fim);
  }, [pedidos, paginaAtual, itensPorPagina]);

  const irParaPagina = (pagina: number) => {
    if (pagina >= 1 && pagina <= totalPaginas) {
      setPaginaAtual(pagina);
    }
  };

  const proximaPagina = () => {
    if (paginaAtual < totalPaginas) {
      setPaginaAtual(paginaAtual + 1);
    }
  };

  const paginaAnterior = () => {
    if (paginaAtual > 1) {
      setPaginaAtual(paginaAtual - 1);
    }
  };

  // Reset para página 1 quando os pedidos mudam
  useEffect(() => {
    setPaginaAtual(1);
  }, [pedidos.length]);

  return {
    pedidosPaginados,
    paginaAtual,
    totalPaginas,
    irParaPagina,
    proximaPagina,
    paginaAnterior,
    totalItens: pedidos.length,
    itemInicial: (paginaAtual - 1) * itensPorPagina + 1,
    itemFinal: Math.min(paginaAtual * itensPorPagina, pedidos.length)
  };
}
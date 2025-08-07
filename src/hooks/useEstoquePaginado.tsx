import { Produto } from '@/hooks/useEstoque';
import { usePaginacao } from '@/hooks/usePaginacao';

interface UseEstoquePaginadoProps {
  produtos: Produto[];
  itensPorPagina?: number;
}

export function useEstoquePaginado({ produtos, itensPorPagina = 20 }: UseEstoquePaginadoProps) {
  const {
    itemsPaginados: produtosPaginados,
    paginaAtual,
    totalPaginas,
    totalItens,
    itemInicial,
    itemFinal,
    irParaPagina,
    proximaPagina,
    paginaAnterior,
  } = usePaginacao({
    items: produtos,
    itensPorPagina,
    resetWhenItemsChange: true,
  });

  return {
    produtosPaginados,
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
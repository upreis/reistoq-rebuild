import { MapeamentoDePara } from '@/hooks/useDePara';
import { usePaginacao } from '@/hooks/usePaginacao';

interface UseDeParaPaginadoProps {
  mapeamentos: MapeamentoDePara[];
  itensPorPagina?: number;
}

export function useDeParaPaginado({ mapeamentos, itensPorPagina = 20 }: UseDeParaPaginadoProps) {
  const {
    itemsPaginados: mapeamentosPaginados,
    paginaAtual,
    totalPaginas,
    totalItens,
    itemInicial,
    itemFinal,
    irParaPagina,
    proximaPagina,
    paginaAnterior,
  } = usePaginacao({
    items: mapeamentos,
    itensPorPagina,
    resetWhenItemsChange: true,
  });

  return {
    mapeamentosPaginados,
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
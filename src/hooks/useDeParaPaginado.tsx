import { useState, useMemo, useEffect } from 'react';
import { MapeamentoDePara } from '@/hooks/useDePara';

interface UseDeParaPaginadoProps {
  mapeamentos: MapeamentoDePara[];
  itensPorPagina?: number;
}

export function useDeParaPaginado({ mapeamentos, itensPorPagina = 20 }: UseDeParaPaginadoProps) {
  const [paginaAtual, setPaginaAtual] = useState(1);

  const totalPaginas = Math.ceil(mapeamentos.length / itensPorPagina);

  const mapeamentosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    return mapeamentos.slice(inicio, fim);
  }, [mapeamentos, paginaAtual, itensPorPagina]);

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

  // Reset para página 1 quando os mapeamentos mudam
  useEffect(() => {
    setPaginaAtual(1);
  }, [mapeamentos.length]);

  return {
    mapeamentosPaginados,
    paginaAtual,
    totalPaginas,
    irParaPagina,
    proximaPagina,
    paginaAnterior,
    totalItens: mapeamentos.length,
    itemInicial: (paginaAtual - 1) * itensPorPagina + 1,
    itemFinal: Math.min(paginaAtual * itensPorPagina, mapeamentos.length)
  };
}
import { useState, useMemo, useEffect } from 'react';
import { Produto } from '@/hooks/useEstoque';

interface UseEstoquePaginadoProps {
  produtos: Produto[];
  itensPorPagina?: number;
}

export function useEstoquePaginado({ produtos, itensPorPagina = 20 }: UseEstoquePaginadoProps) {
  const [paginaAtual, setPaginaAtual] = useState(1);

  const totalPaginas = Math.ceil(produtos.length / itensPorPagina);

  const produtosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    return produtos.slice(inicio, fim);
  }, [produtos, paginaAtual, itensPorPagina]);

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

  // Reset para página 1 quando os produtos mudam
  useEffect(() => {
    setPaginaAtual(1);
  }, [produtos.length]);

  return {
    produtosPaginados,
    paginaAtual,
    totalPaginas,
    irParaPagina,
    proximaPagina,
    paginaAnterior,
    totalItens: produtos.length,
    itemInicial: (paginaAtual - 1) * itensPorPagina + 1,
    itemFinal: Math.min(paginaAtual * itensPorPagina, produtos.length)
  };
}
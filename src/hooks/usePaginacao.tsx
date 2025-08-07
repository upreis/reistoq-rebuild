import { useState, useMemo, useEffect } from 'react';

interface UsePaginacaoProps<T> {
  items: T[];
  itensPorPagina?: number;
  resetWhenItemsChange?: boolean;
}

interface UsePaginacaoReturn<T> {
  itemsPaginados: T[];
  paginaAtual: number;
  totalPaginas: number;
  totalItens: number;
  itemInicial: number;
  itemFinal: number;
  irParaPagina: (pagina: number) => void;
  proximaPagina: () => void;
  paginaAnterior: () => void;
  setPaginaAtual: (pagina: number) => void;
}

/**
 * Hook genérico para paginação de qualquer array de dados
 * @param items - Array de itens para paginar
 * @param itensPorPagina - Número de itens por página (padrão: 20)
 * @param resetWhenItemsChange - Se deve resetar para página 1 quando items mudam (padrão: true)
 */
export function usePaginacao<T>({ 
  items, 
  itensPorPagina = 20,
  resetWhenItemsChange = true 
}: UsePaginacaoProps<T>): UsePaginacaoReturn<T> {
  const [paginaAtual, setPaginaAtual] = useState(1);

  const totalItens = items.length;
  const totalPaginas = Math.ceil(totalItens / itensPorPagina);

  const itemsPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    return items.slice(inicio, fim);
  }, [items, paginaAtual, itensPorPagina]);

  const itemInicial = totalItens === 0 ? 0 : (paginaAtual - 1) * itensPorPagina + 1;
  const itemFinal = Math.min(paginaAtual * itensPorPagina, totalItens);

  const irParaPagina = (pagina: number) => {
    if (pagina >= 1 && pagina <= totalPaginas) {
      setPaginaAtual(pagina);
    }
  };

  const proximaPagina = () => {
    if (paginaAtual < totalPaginas) {
      setPaginaAtual(prev => prev + 1);
    }
  };

  const paginaAnterior = () => {
    if (paginaAtual > 1) {
      setPaginaAtual(prev => prev - 1);
    }
  };

  // Reset para página 1 quando os dados mudarem (opcional)
  useEffect(() => {
    if (resetWhenItemsChange) {
      setPaginaAtual(1);
    }
  }, [totalItens, resetWhenItemsChange]);

  return {
    itemsPaginados,
    paginaAtual,
    totalPaginas,
    totalItens,
    itemInicial,
    itemFinal,
    irParaPagina,
    proximaPagina,
    paginaAnterior,
    setPaginaAtual,
  };
}
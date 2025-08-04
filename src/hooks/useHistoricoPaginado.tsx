import { useState, useMemo, useEffect } from 'react';

interface MovimentacaoHistorico {
  id: string;
  produto_id: string;
  tipo_movimentacao: string;
  quantidade_anterior: number;
  quantidade_nova: number;
  quantidade_movimentada: number;
  motivo: string | null;
  observacoes: string | null;
  created_at: string;
  produto?: {
    nome: string;
    sku_interno: string;
    codigo_barras: string | null;
  };
}

interface UseHistoricoPaginadoProps {
  movimentacoes: MovimentacaoHistorico[];
  itensPorPagina?: number;
}

export function useHistoricoPaginado({ 
  movimentacoes, 
  itensPorPagina = 20 
}: UseHistoricoPaginadoProps) {
  const [paginaAtual, setPaginaAtual] = useState(1);

  const totalItens = movimentacoes.length;
  const totalPaginas = Math.ceil(totalItens / itensPorPagina);

  const movimentacoesPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    return movimentacoes.slice(inicio, fim);
  }, [movimentacoes, paginaAtual, itensPorPagina]);

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

  // Reset para página 1 quando os dados mudarem
  useEffect(() => {
    setPaginaAtual(1);
  }, [movimentacoes.length]);

  return {
    movimentacoesPaginadas,
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
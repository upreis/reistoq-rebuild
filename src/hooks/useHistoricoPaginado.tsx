import { usePaginacao } from '@/hooks/usePaginacao';

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
  const {
    itemsPaginados: movimentacoesPaginadas,
    paginaAtual,
    totalPaginas,
    totalItens,
    itemInicial,
    itemFinal,
    irParaPagina,
    proximaPagina,
    paginaAnterior,
  } = usePaginacao({
    items: movimentacoes,
    itensPorPagina,
    resetWhenItemsChange: true,
  });

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
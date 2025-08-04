import { useState, useMemo, useEffect } from 'react';

interface HistoricoVenda {
  id: string;
  id_unico: string;
  numero_pedido: string;
  sku_produto: string;
  nome_produto: string | null;
  quantidade_vendida: number;
  valor_unitario: number;
  valor_total: number;
  cliente_nome: string | null;
  cliente_documento: string | null;
  status: string;
  observacoes: string | null;
  data_venda: string;
  created_at: string;
  updated_at: string;
}

interface UseHistoricoVendasPaginadoProps {
  vendas: HistoricoVenda[];
  itensPorPagina?: number;
}

export function useHistoricoVendasPaginado({ 
  vendas, 
  itensPorPagina = 20 
}: UseHistoricoVendasPaginadoProps) {
  const [paginaAtual, setPaginaAtual] = useState(1);

  const totalItens = vendas.length;
  const totalPaginas = Math.ceil(totalItens / itensPorPagina);

  const vendasPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    return vendas.slice(inicio, fim);
  }, [vendas, paginaAtual, itensPorPagina]);

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
  }, [vendas.length]);

  return {
    vendasPaginadas,
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
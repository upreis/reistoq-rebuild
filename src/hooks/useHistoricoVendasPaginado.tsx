import { useState, useMemo, useEffect } from 'react';

interface HistoricoVenda {
  id: string;
  id_unico: string;
  numero_pedido: string;
  sku_produto: string;
  descricao: string | null;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  cliente_nome: string | null;
  cliente_documento: string | null;
  status: string;
  observacoes: string | null;
  data_pedido: string;
  created_at: string;
  updated_at: string;
  ncm: string | null;
  codigo_barras: string | null;
  pedido_id: string | null;
  cpf_cnpj: string | null;
  valor_frete: number | null;
  data_prevista: string | null;
  obs: string | null;
  obs_interna: string | null;
  cidade: string | null;
  uf: string | null;
  url_rastreamento: string | null;
  situacao: string | null;
  codigo_rastreamento: string | null;
  numero_ecommerce: string | null;
  valor_desconto: number | null;
  numero_venda: string | null;
  sku_estoque: string | null;
  sku_kit: string | null;
  qtd_kit: number | null;
  total_itens: number | null;
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
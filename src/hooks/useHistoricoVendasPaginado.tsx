import { usePaginacao } from '@/hooks/usePaginacao';

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
  const {
    itemsPaginados: vendasPaginadas,
    paginaAtual,
    totalPaginas,
    totalItens,
    itemInicial,
    itemFinal,
    irParaPagina,
    proximaPagina,
    paginaAnterior,
  } = usePaginacao({
    items: vendas,
    itensPorPagina,
    resetWhenItemsChange: true,
  });

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
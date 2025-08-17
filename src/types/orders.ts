// Types para o sistema de pedidos

export type OrderStatus = 
  | 'Em Aberto' 
  | 'Aprovado' 
  | 'Preparando Envio' 
  | 'Faturado' 
  | 'Pronto para Envio' 
  | 'Enviado' 
  | 'Entregue' 
  | 'Nao Entregue' 
  | 'Cancelado';

export type Fonte = 'interno' | 'mercadolivre' | 'ambas';

export type StockStatus = 
  | 'disponivel' 
  | 'sem-estoque' 
  | 'sem-mapeamento' 
  | 'processado' 
  | 'processando';

export interface OrderItem {
  id: string;
  pedido_id: string;
  numero_pedido: string;
  sku: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  ncm?: string;
  codigo_barras?: string;
  observacoes?: string;
  empresa?: string;
  numero_venda?: string;
  
  // Dados do pedido (joined)
  numero_ecommerce?: string;
  nome_cliente: string;
  cpf_cnpj?: string;
  cidade?: string;
  uf?: string;
  data_pedido: string;
  data_prevista?: string;
  situacao: OrderStatus;
  codigo_rastreamento?: string;
  url_rastreamento?: string;
  obs?: string;
  obs_interna?: string;
  valor_frete: number;
  valor_desconto: number;
  created_at?: string;
  updated_at?: string;
  
  // Campos DE/PARA e estoque
  sku_kit?: string;
  qtd_kit?: number;
  sku_correspondente?: string;
  sku_simples?: string;
  produto_nome?: string;
  produto_categoria?: string;
  estoque_atual?: number;
  ja_processado?: boolean;
  
  // Mapeamento aplicado
  mapeamento_aplicado?: {
    sku_simples: string;
    quantidade: number;
  };
  
  // Canal
  canal_venda?: string;
  nome_ecommerce?: string;
}

export interface OrderMetrics {
  totalItens: number;
  totalPedidos: number;
  pedidosPendentes: number;
  pedidosAprovados: number;
  pedidosEnviados: number;
  pedidosEntregues: number;
  valorTotal: number;
}

export interface OrderFilters {
  q?: string;
  from?: string;
  to?: string;
  situacoes?: string[];
  fonte?: Fonte;
  contas?: string[];
}

export interface ListParams extends OrderFilters {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface ListResponse {
  items: OrderItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BulkStockItem {
  id: string;
  numero_pedido: string;
  sku_pedido: string;
  sku_kit: string;
  quantidade_kit: number;
  quantidade_pedido: number;
  qtd_kit: number;
  descricao: string;
  nome_cliente: string;
  data_pedido: string;
  valor_unitario: number;
  valor_total: number;
}

export interface BulkPayload {
  itens: BulkStockItem[];
}

export interface BulkResult {
  success: boolean;
  processados: number;
  erros: Array<{
    id: string;
    motivo: string;
  }>;
}

export interface OrderDetails {
  pedido: OrderItem;
  itens: OrderItem[];
  timeline?: Array<{
    data: string;
    status: string;
    observacao?: string;
  }>;
}
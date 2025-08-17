import { z } from 'zod';

// Schema para status de pedido
export const OrderStatusSchema = z.enum([
  'Em Aberto',
  'Aprovado', 
  'Preparando Envio',
  'Faturado',
  'Pronto para Envio',
  'Enviado',
  'Entregue',
  'Nao Entregue',
  'Cancelado'
]);

// Schema para fonte de dados
export const FonteSchema = z.enum(['interno', 'mercadolivre', 'ambas']);

// Schema para item de pedido
export const OrderItemSchema = z.object({
  id: z.string(),
  pedido_id: z.string(),
  numero_pedido: z.string(),
  sku: z.string(),
  descricao: z.string(),
  quantidade: z.number().min(0),
  valor_unitario: z.number().min(0),
  valor_total: z.number().min(0),
  ncm: z.string().optional(),
  codigo_barras: z.string().optional(),
  observacoes: z.string().optional(),
  empresa: z.string().optional(),
  numero_venda: z.string().optional(),
  
  // Dados do pedido
  numero_ecommerce: z.string().optional(),
  nome_cliente: z.string(),
  cpf_cnpj: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
  data_pedido: z.string(),
  data_prevista: z.string().optional(),
  situacao: OrderStatusSchema,
  codigo_rastreamento: z.string().optional(),
  url_rastreamento: z.string().optional(),
  obs: z.string().optional(),
  obs_interna: z.string().optional(),
  valor_frete: z.number().default(0),
  valor_desconto: z.number().default(0),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  
  // Campos DE/PARA
  sku_kit: z.string().optional(),
  qtd_kit: z.number().optional(),
  sku_correspondente: z.string().optional(),
  sku_simples: z.string().optional(),
  produto_nome: z.string().optional(),
  produto_categoria: z.string().optional(),
  estoque_atual: z.number().optional(),
  ja_processado: z.boolean().optional(),
  
  // Canal
  canal_venda: z.string().optional(),
  nome_ecommerce: z.string().optional(),
});

// Schema para filtros
export const OrderFiltersSchema = z.object({
  q: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  situacoes: z.array(z.string()).optional(),
  fonte: FonteSchema.optional(),
  contas: z.array(z.string()).optional(),
});

// Schema para parâmetros de listagem
export const ListParamsSchema = OrderFiltersSchema.extend({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(1000).default(100),
  sort: z.string().default('data_pedido'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// Schema para resposta de listagem
export const ListResponseSchema = z.object({
  items: z.array(OrderItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

// Schema para item de baixa de estoque
export const BulkStockItemSchema = z.object({
  id: z.string(),
  numero_pedido: z.string(),
  sku_pedido: z.string(),
  sku_kit: z.string(),
  quantidade_kit: z.number().min(1),
  quantidade_pedido: z.number().min(1),
  qtd_kit: z.number().min(1),
  descricao: z.string(),
  nome_cliente: z.string(),
  data_pedido: z.string(),
  valor_unitario: z.number().min(0),
  valor_total: z.number().min(0),
});

// Schema para payload de baixa em lote
export const BulkPayloadSchema = z.object({
  itens: z.array(BulkStockItemSchema).min(1),
});

// Schema para resultado de baixa em lote
export const BulkResultSchema = z.object({
  success: z.boolean(),
  processados: z.number(),
  erros: z.array(z.object({
    id: z.string(),
    motivo: z.string(),
  })),
});

// Schema para detalhes do pedido
export const OrderDetailsSchema = z.object({
  pedido: OrderItemSchema,
  itens: z.array(OrderItemSchema),
  timeline: z.array(z.object({
    data: z.string(),
    status: z.string(),
    observacao: z.string().optional(),
  })).optional(),
});

// Helper para validação segura
export function safeParseWithIssues<T>(schema: z.ZodSchema<T>, data: unknown) {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error('Validation failed:', result.error.issues);
    return { success: false, issues: result.error.issues, data: null };
  }
  return { success: true, issues: [], data: result.data };
}
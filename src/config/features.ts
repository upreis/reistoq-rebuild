export type Filtros = {
  dataInicio?: string;
  dataFinal?: string;
  situacoes?: string[];
  busca?: string;
  accountId?: string; // ML
  integrationAccountId?: string; // Tiny (multi-conta)
  fulfillmentOnly?: boolean; // ML
  page?: number;
  pageSize?: number;
};

export type UsePedidosReturn = {
  itens: any[];
  loading: boolean;
  error: string | null;
  total?: number;
  fetchPage: (page?: number) => Promise<void>;
  refetch: () => Promise<void>;
  lastRequestId?: string; // ML
};

export const FEATURE_ML = true;
export const FEATURE_TINY = true;
export const FEATURE_SHOPEE = false; // stub
export const FEATURE_QA_TEST = false;

// Helper to detect non-production quickly without relying on VITE_* variables
export const IS_NON_PRODUCTION = (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.MODE !== 'production');

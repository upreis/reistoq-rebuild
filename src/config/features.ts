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
  ms?: number;            // duração da última chamada
  reqId?: string;         // alias amigável para lastRequestId
};

export const FEATURE_ML = true;
export const FEATURE_TINY = true;
export const FEATURE_SHOPEE = true; // habilitado nesta branch
export const FEATURE_QA_TEST = true; // desligado por padrão nesta branch
export const FEATURE_TINY_EDGE = false; // controla uso da nova edge do Tiny
export const FEATURE_TINY_LIVE = true; // controla uso do novo proxy live do Tiny
export const FEATURE_TINY_V3_LIVE = false; // controla uso do novo proxy Tiny v3

// Helper to detect non-production quickly without relying on VITE_* variables
export const IS_NON_PRODUCTION = (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.MODE !== 'production');

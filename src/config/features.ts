// Feature flags for the application
export const FEATURES = {
  // Disable client mutations to historico_vendas (read via RPC only)
  VENDAS_MUTATE_UI: false,
  
  // Other feature flags
  SYNC_AUTOMATICO: true,
  ALERTAS_TEMPO_REAL: true,
  SCANNER_AVANCADO: true,
  
  // Mobile FAB scanner button
  MOBILE_SCAN_FAB: true,
} as const;

// Legacy exports for compatibility (will be migrated)
export const FEATURE_MOBILE_SCAN_FAB = true;
export const FEATURE_TINY_V3_CONNECT = true;
export const FEATURE_QA_TEST = false;
export const IS_NON_PRODUCTION = false;
export const FEATURE_TINY_LIVE = true;
export const FEATURE_TINY_V3_LIVE = true;
export const FEATURE_TINY_EDGE = true;

// Types for hooks
export interface Filtros {
  [key: string]: any;
}

export interface UsePedidosReturn {
  [key: string]: any;
}

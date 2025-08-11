import { usePedidosML, type Filtros as FiltrosML, type UsePedidosReturn } from '@/hooks/usePedidosML';
import { usePedidosTiny, type Filtros as FiltrosTiny } from '@/hooks/usePedidosTiny';
import { usePedidosShopee, type Filtros as FiltrosShopee } from '@/hooks/usePedidosShopee';

export type Filtros = FiltrosML & FiltrosTiny & FiltrosShopee;

export function usePedidosFactory(origem: 'mercadolivre'|'tiny'|'shopee', filtros: Filtros): UsePedidosReturn {
  if (origem === 'mercadolivre') return usePedidosML(filtros);
  if (origem === 'tiny') return usePedidosTiny(filtros);
  return usePedidosShopee(filtros);
}

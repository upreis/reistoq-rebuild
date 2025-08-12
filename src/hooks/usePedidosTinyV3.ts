import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toTinyDate } from "@/lib/date-providers";
import { FEATURE_TINY_V3_LIVE, FEATURE_QA_TEST, type Filtros, type UsePedidosReturn } from "@/config/features";

function ddmmyyyyToISO(d: string) {
  const [dd, mm, yyyy] = d.split("/");
  return `${yyyy}-${mm}-${dd}`;
}

export function usePedidosTinyV3(initialFiltros?: Partial<Filtros>): UsePedidosReturn {
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(initialFiltros?.page || 1);
  const [pageSize] = useState<number>(initialFiltros?.pageSize || 50);
  const [total, setTotal] = useState<number>(0);
  const [reqId, setReqId] = useState<string | undefined>(undefined);
  const [ms, setMs] = useState<number | undefined>(undefined);
  const [paging, setPaging] = useState<{ total: number; limit: number; offset: number } | undefined>(undefined);

  const filtros = useMemo(() => ({
    dataInicio: initialFiltros?.dataInicio || "",
    dataFinal: initialFiltros?.dataFinal || "",
    situacoes: initialFiltros?.situacoes || [],
    busca: initialFiltros?.busca || "",
  }), [initialFiltros?.dataInicio, initialFiltros?.dataFinal, initialFiltros?.situacoes, initialFiltros?.busca]);

  const refetch = useCallback(async () => {
    if (!FEATURE_TINY_V3_LIVE) return;
    setLoading(true);
    setError(null);
    const t0 = performance.now();
    try {
      const dateFrom = toTinyDate(filtros.dataInicio);
      const dateTo = toTinyDate(filtros.dataFinal);
      const numero = (filtros.busca || "").trim();
      const statuses = (filtros.situacoes || []).slice();
      const body = { page, pageSize, dateFrom, dateTo, numero, statuses, expand: "items" } as const;
      if (FEATURE_QA_TEST) console.info('[tiny-v3] body', body);
      const { data, error } = await supabase.functions.invoke("tiny-v3-orders-proxy", { body });

      const dt = performance.now() - t0;
      setMs(Math.round(dt));
      if (error) throw error;

      const reqIdFromBody = (data as any)?.requestId;
      setReqId(reqIdFromBody);

      const pedidos = (data as any)?.results || [];
      const pagingResp = (data as any)?.paging || {};
      setPaging(pagingResp);
      setTotal(Number(pagingResp?.total || 0));

      const itensFlatten: any[] = [];
      for (const pedido of pedidos) {
        const numero_pedido = String(pedido?.number || pedido?.numero || pedido?.id || "");
        const numero_ecommerce = String(pedido?.ecommerce_number || pedido?.numero_ecommerce || "");
        const nome_cliente = pedido?.customer?.name || pedido?.cliente?.nome || pedido?.nomeCliente || "";
        const situacaoAtual = String(pedido?.status || pedido?.situacao || "");
        const cidade = pedido?.shipping_address?.city || pedido?.destino?.cidade || pedido?.cliente?.cidade || "";
        const uf = pedido?.shipping_address?.state || pedido?.destino?.uf || pedido?.cliente?.uf || "";
        const dataTiny = String(pedido?.issue_date || pedido?.data || pedido?.data_pedido || "");
        const dataISO = /^\d{2}\/\d{2}\/\d{4}$/.test(dataTiny) ? ddmmyyyyToISO(dataTiny) : dataTiny;
        const valor_total_pedido = Number(pedido?.total || pedido?.valor_total || 0) || 0;

        const itensPedido = pedido?.items || pedido?.itens || [];
        if (Array.isArray(itensPedido) && itensPedido.length) {
          for (const it of itensPedido) {
            const sku = it?.sku || it?.codigo || it?.codigo_sku || "";
            const descricao = it?.description || it?.descricao || it?.nome || "";
            const quantidade = Number(it?.quantity || it?.quantidade || 0) || 0;
            const valor_unitario = Number(it?.unit_price || it?.valor_unitario || it?.preco || 0) || 0;
            const valor_total = Number(it?.total || valor_unitario * quantidade) || 0;

            itensFlatten.push({
              id: `${numero_pedido}-${sku}`,
              pedido_id: String(pedido?.id || numero_pedido),
              numero_pedido,
              sku,
              descricao,
              quantidade,
              valor_unitario,
              valor_total,
              numero_ecommerce,
              nome_cliente,
              cidade,
              uf,
              data_pedido: dataISO,
              situacao: situacaoAtual,
              valor_frete: Number(pedido?.freight || pedido?.valor_frete || 0),
              valor_desconto: Number(pedido?.discount || pedido?.valor_desconto || 0),
              valor_total_pedido,
            });
          }
        } else {
          itensFlatten.push({
            id: `${numero_pedido}`,
            pedido_id: String(pedido?.id || numero_pedido),
            numero_pedido,
            sku: "",
            descricao: pedido?.notes || pedido?.observacoes || "Pedido",
            quantidade: 1,
            valor_unitario: valor_total_pedido,
            valor_total: valor_total_pedido,
            numero_ecommerce,
            nome_cliente,
            cidade,
            uf,
            data_pedido: dataISO,
            situacao: situacaoAtual,
            valor_frete: Number(pedido?.freight || 0),
            valor_desconto: Number(pedido?.discount || 0),
            valor_total_pedido,
          });
        }
      }

      setItens(itensFlatten);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [filtros.dataInicio, filtros.dataFinal, filtros.situacoes, filtros.busca, page, pageSize]);

  const fetchPage = useCallback(async (p?: number) => {
    if (typeof p === 'number') setPage(p);
    await refetch();
  }, [refetch]);

  useEffect(() => {
    if (FEATURE_TINY_V3_LIVE) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.dataInicio, filtros.dataFinal, filtros.situacoes, filtros.busca]);

  return {
    itens,
    loading,
    error,
    total,
    fetchPage,
    refetch,
    ms,
    reqId,
    paging,
  };
}

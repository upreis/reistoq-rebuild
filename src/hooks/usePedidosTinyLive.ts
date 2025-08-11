import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toTinyDate } from "@/lib/date-providers";
import { FEATURE_TINY_LIVE, type Filtros, type UsePedidosReturn } from "@/config/features";

// Helper local para converter DD/MM/AAAA -> YYYY-MM-DD (ISO curto)
function ddmmyyyyToISO(d: string) {
  const [dd, mm, yyyy] = d.split("/");
  return `${yyyy}-${mm}-${dd}`;
}

export function usePedidosTinyLive(initialFiltros?: Partial<Filtros>): UsePedidosReturn {
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(initialFiltros?.page || 1);
  const [pageSize] = useState<number>(initialFiltros?.pageSize || 50);
  const [total, setTotal] = useState<number>(0);
  const [reqId, setReqId] = useState<string | undefined>(undefined);
  const [ms, setMs] = useState<number | undefined>(undefined);

  const filtros = useMemo(() => ({
    dataInicio: initialFiltros?.dataInicio || "",
    dataFinal: initialFiltros?.dataFinal || "",
    situacoes: initialFiltros?.situacoes || [],
    busca: initialFiltros?.busca || "",
  }), [initialFiltros?.dataInicio, initialFiltros?.dataFinal, initialFiltros?.situacoes, initialFiltros?.busca]);

  const refetch = useCallback(async () => {
    if (!FEATURE_TINY_LIVE) {
      // Flag desligada: não faz nada, mantém comportamento atual fora deste hook
      return;
    }
    setLoading(true);
    setError(null);
    const t0 = performance.now();
    try {
      const dateFrom = toTinyDate(filtros.dataInicio);
      const dateTo = toTinyDate(filtros.dataFinal);
      const situacao = (filtros.situacoes?.[0] || "").trim();
      const numero = (filtros.busca || "").trim();

      const body = {
        page,
        pageSize,
        dateFrom,
        dateTo,
        situacao,
        situacoes: filtros.situacoes || [],
        numero,
        expand: "items",
      };
      console.info('[tiny-live] chamando tiny-orders-proxy', body);
      const { data, error } = await supabase.functions.invoke("tiny-orders-proxy", {
        body,
      });

      const dt = performance.now() - t0;
      setMs(Math.round(dt));

      if (error) throw error;

      const reqHeader = (error as any)?.response?.headers?.get?.("x-request-id") || undefined;
      const reqIdFromBody = (data as any)?.requestId;
      setReqId(reqHeader || reqIdFromBody);

      const pedidos = (data as any)?.results || [];
      const paging = (data as any)?.paging || {};
      setTotal(Number(paging?.total || 0));

      // Achatar em itens de pedido para não quebrar a UI atual
      const itensFlatten: any[] = [];
      for (const pedido of pedidos) {
        const numero_pedido = String(pedido?.numero || pedido?.numeroPedido || pedido?.id || "");
        const numero_ecommerce = String(pedido?.numero_ecommerce || pedido?.numero_ecommerce_pedido || pedido?.numeroPedido || "");
        const nome_cliente = pedido?.cliente?.nome || pedido?.nomeCliente || "";
        const situacaoAtual = String(pedido?.situacao || pedido?.situacao_atual || "");
        const cidade = pedido?.destino?.cidade || pedido?.cliente?.cidade || "";
        const uf = pedido?.destino?.uf || pedido?.cliente?.uf || pedido?.cliente?.estado || "";
        const dataTiny = String(pedido?.data_pedido || pedido?.data || ""); // geralmente DD/MM/AAAA
        const dataISO = /^\d{2}\/\d{2}\/\d{4}$/.test(dataTiny) ? ddmmyyyyToISO(dataTiny) : dataTiny;
        const valor_total_pedido = Number(pedido?.valor_total || pedido?.total || pedido?.valor) || 0;

        const itensPedido = pedido?.itens || pedido?.pedido_itens || [];
        if (Array.isArray(itensPedido) && itensPedido.length) {
          for (const it of itensPedido) {
            const sku = it?.codigo || it?.sku || it?.codigo_sku || "";
            const descricao = it?.descricao || it?.produto || it?.nome || "";
            const quantidade = Number(it?.quantidade || it?.qtd || 0) || 0;
            const valor_unitario = Number(it?.valor_unitario || it?.valor || it?.preco || 0) || 0;
            const valor_total = valor_unitario * quantidade;

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
              valor_frete: Number(pedido?.valor_frete || 0),
              valor_desconto: Number(pedido?.valor_desconto || 0),
              valor_total_pedido,
            });
          }
        } else {
          // Sem itens detalhados, criar 1 linha mínima por pedido
          itensFlatten.push({
            id: `${numero_pedido}`,
            pedido_id: String(pedido?.id || numero_pedido),
            numero_pedido,
            sku: "",
            descricao: pedido?.observacoes || "Pedido",
            quantidade: 1,
            valor_unitario: valor_total_pedido,
            valor_total: valor_total_pedido,
            numero_ecommerce,
            nome_cliente,
            cidade,
            uf,
            data_pedido: dataISO,
            situacao: situacaoAtual,
            valor_frete: Number(pedido?.valor_frete || 0),
            valor_desconto: Number(pedido?.valor_desconto || 0),
            valor_total_pedido,
          });
        }
      }

      setItens(itensFlatten);

      // Persistência opcional em background (best-effort, não bloqueia UI)
      try {
        // Envie para uma função existente de sync se precisar no futuro
        // await supabase.functions.invoke('sync-pedidos-tiny-basico', { body: { pedidos } });
      } catch (_) { /* ignore */ }
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
    // Atualiza quando filtros mudarem (flag deve estar true para ter efeito)
    if (FEATURE_TINY_LIVE) {
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
  };
}

// Tiny Orders Edge Function
// Provides server-side filtering and pagination for Tiny ERP orders stored in Supabase
// CORS enabled, RLS enforced via forwarded JWT

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: any, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
    ...init,
  });
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const url = new URL(req.url);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  try {
    // Read params from GET or POST
    const isGet = req.method === 'GET';
    let body: any = {};
    if (!isGet) {
      try { body = await req.json(); } catch { body = {}; }
    }

    const qp = url.searchParams;

    const page = Number(isGet ? qp.get('page') : body.page) || 1;
    const pageSize = Math.min(Number(isGet ? qp.get('pageSize') : body.pageSize) || 100, 500);

    // Filters
    const dateFrom = (isGet ? qp.get('dateFrom') : (body.dateFrom ?? body.filters?.dateFrom)) || null;
    const dateTo = (isGet ? qp.get('dateTo') : (body.dateTo ?? body.filters?.dateTo)) || null;
    const status = (isGet ? qp.get('status') : (body.status ?? body.filters?.status)) || null;
    const numero = (isGet ? qp.get('numero') : (body.numero ?? body.filters?.numero)) || null;
    const integrationAccountId = (isGet ? qp.get('integration_account_id') : (body.integration_account_id ?? body.filters?.integration_account_id)) || null;
    const expandItems = ((isGet ? qp.get('expand') : (body.expand ?? body.filters?.expand)) ?? 'items') === 'items' || (isGet ? qp.get('expandItems') === 'true' : !!body.expandItems);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const startedAt = Date.now();

    // Build query for pedidos with server-side filters
    let q = supabase
      .from('pedidos')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (numero && numero.trim() !== '') {
      // filter by numero OR numero_ecommerce using or
      q = q.or(`numero.ilike.%${numero}%,numero_ecommerce.ilike.%${numero}%`);
    }

    if (dateFrom) {
      q = q.gte('data_pedido', dateFrom);
    }
    if (dateTo) {
      q = q.lte('data_pedido', dateTo);
    }

    if (status && status !== 'todas') {
      q = q.eq('situacao', status);
    }

    if (integrationAccountId) {
      q = q.eq('integration_account_id', integrationAccountId);
    }

    const { data: pedidos, error: pedidosError, count } = await q;
    if (pedidosError) {
      console.log(`tiny:${requestId} pedidosError`, pedidosError);
      return json({ error: 'Falha ao consultar pedidos', details: pedidosError }, { status: 400 });
    }

    let itens: any[] = [];
    if (expandItems && pedidos && pedidos.length > 0) {
      const pedidoIds = pedidos.map((p: any) => p.id).filter(Boolean);
      const { data: itensData, error: itensError } = await supabase
        .from('itens_pedidos')
        .select('*')
        .in('pedido_id', pedidoIds)
        .limit(10000);
      if (itensError) {
        console.log(`tiny:${requestId} itensError`, itensError);
        // Não falhar toda a resposta por causa dos itens
      } else {
        itens = itensData || [];
      }
    }

    const elapsed = Date.now() - startedAt;
    console.log(`tiny:${requestId} ok page=${page} size=${pageSize} pedidos=${pedidos?.length ?? 0} itens=${itens?.length ?? 0} in ${elapsed}ms`);

    return json({
      requestId,
      page,
      pageSize,
      total: count ?? 0,
      pedidos: pedidos ?? [],
      itens,
    });
  } catch (e: any) {
    console.error(`tiny:${requestId} unhandled`, e);
    return json({ error: 'Erro interno', message: e?.message || String(e) }, { status: 500 });
  }
});

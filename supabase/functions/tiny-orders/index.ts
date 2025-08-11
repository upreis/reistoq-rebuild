import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Expose-Headers": "x-request-id",
};

function json(body: any, status = 200, requestId?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...CORS };
  if (requestId) headers["x-request-id"] = requestId;
  return new Response(JSON.stringify(body), { status, headers });
}

function isDDMMYYYY(s?: string | null): s is string {
  if (!s) return false;
  return /^\d{2}\/\d{2}\/\d{4}$/.test(s.trim());
}

function ddmmyyyyToISO(s: string): string {
  const [dd, mm, yyyy] = s.split("/");
  return `${yyyy}-${mm}-${dd}`;
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  if (req.method === "OPTIONS") return new Response(null, { headers: { ...CORS, "x-request-id": requestId } });

  // Auth context for RLS
  const supabaseAnon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("authorization") || "" } } }
  );

  try {
    // Support GET (query) and POST (json body)
    let page = 1;
    let pageSize = 50;
    let dateFrom: string | undefined;
    let dateTo: string | undefined;
    let status: string | undefined;
    let numero: string | undefined;
    let integration_account_id: string | undefined;
    let expand: string | undefined;

    if (req.method === "GET") {
      const p = new URL(req.url).searchParams;
      page = Math.max(1, Number(p.get("page") || "1"));
      pageSize = Math.min(500, Math.max(1, Number(p.get("pageSize") || "50")));
      dateFrom = p.get("dateFrom") || undefined;
      dateTo = p.get("dateTo") || undefined;
      status = p.get("status") || undefined;
      numero = p.get("numero") || undefined;
      integration_account_id = p.get("integration_account_id") || undefined;
      expand = p.get("expand") || undefined;
    } else if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      page = Math.max(1, Number(body.page ?? 1));
      pageSize = Math.min(500, Math.max(1, Number(body.pageSize ?? 50)));
      dateFrom = body.dateFrom;
      dateTo = body.dateTo;
      status = body.status;
      numero = body.numero;
      integration_account_id = body.integration_account_id;
      expand = body.expand;
    } else {
      return json({ error: "method_not_allowed", requestId }, 405, requestId);
    }

    // Validate dates strictly when provided
    if (dateFrom && !isDDMMYYYY(dateFrom)) {
      return json({ error: "invalid_date_format", field: "dateFrom", expected: "DD/MM/AAAA", requestId }, 400, requestId);
    }
    if (dateTo && !isDDMMYYYY(dateTo)) {
      return json({ error: "invalid_date_format", field: "dateTo", expected: "DD/MM/AAAA", requestId }, 400, requestId);
    }

    const fromISO = dateFrom ? ddmmyyyyToISO(dateFrom) : undefined;
    const toISO = dateTo ? ddmmyyyyToISO(dateTo) : undefined;

    // Build base query for pedidos with RLS
    let pedidosQuery = supabaseAnon.from("pedidos").select("*", { count: "exact" }).order("created_at", { ascending: false });

    if (fromISO) pedidosQuery = pedidosQuery.gte("data_pedido", fromISO);
    if (toISO) pedidosQuery = pedidosQuery.lte("data_pedido", toISO);
    if (status && status.trim()) pedidosQuery = pedidosQuery.ilike("situacao", `%${status.trim()}%`);
    if (numero && numero.trim()) pedidosQuery = pedidosQuery.ilike("numero", `%${numero.trim()}%`);
    if (integration_account_id) pedidosQuery = pedidosQuery.eq("integration_account_id", integration_account_id);

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: pedidos, error: errPedidos, count } = await pedidosQuery.range(from, to);
    if (errPedidos) return json({ error: errPedidos.message, requestId }, 400, requestId);

    let itens: any[] = [];
    if ((expand || "").includes("items") && pedidos && pedidos.length > 0) {
      const numeros = pedidos.map((p: any) => p.numero).filter(Boolean);
      const { data: itensResp, error: errItens } = await supabaseAnon
        .from("itens_pedidos")
        .select("*")
        .in("numero_pedido", numeros);
      if (errItens) return json({ error: errItens.message, requestId }, 400, requestId);
      itens = itensResp || [];
    }

    return json({ page, pageSize, total: count || 0, pedidos: pedidos || [], itens, requestId }, 200, requestId);
  } catch (e: any) {
    return json({ error: String(e?.message || e), requestId }, 500, requestId);
  }
});

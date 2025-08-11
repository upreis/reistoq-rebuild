// Supabase Edge Function: tiny-orders
// JSON-only responses with x-request-id and strict DD/MM/AAAA date validation
// Filters: dateFrom/dateTo (DD/MM/AAAA), status (ilike), numero, integration_account_id, expand=items
// Pagination: page/pageSize (≤500)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Expose-Headers": "x-request-id",
};

function json(body: any, status = 200, requestId?: string) {
  const headers: Record<string,string> = { "Content-Type": "application/json", ...CORS };
  if (requestId) headers["x-request-id"] = requestId;
  return new Response(JSON.stringify(body), { status, headers });
}

function isDDMMYYYY(s?: string | null): s is string {
  if (!s) return false;
  return /^\d{2}\/\d{2}\/\d{4}$/.test(s);
}

function ddmmyyyyToISO(s: string): string {
  const [dd, mm, yyyy] = s.split('/') as [string, string, string];
  return `${yyyy}-${mm}-${dd}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const requestId = crypto.randomUUID();

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('authorization') || '' } }
    });

    // Auth required (RLS)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'unauthenticated', requestId }, 401, requestId);

    // Accept body JSON; fallback to URL params
    let body: any = {};
    try { body = await req.json(); } catch (_) {
      const p = new URL(req.url).searchParams;
      body = Object.fromEntries(p.entries());
    }

    const page = Math.max(1, Number(body.page || 1));
    const pageSize = Math.max(1, Math.min(500, Number(body.pageSize || 500)));
    const dateFrom = body.dateFrom as string | undefined;
    const dateTo = body.dateTo as string | undefined;
    const status = body.status as string | undefined;
    const numero = body.numero as string | undefined;
    const integrationAccountId = body.integration_account_id as string | undefined;
    const expand = String(body.expand || '').toLowerCase();

    // Strict date validation: only DD/MM/AAAA
    if (dateFrom && !isDDMMYYYY(dateFrom)) {
      return json({ error: 'invalid_date_format', field: 'dateFrom', expected: 'DD/MM/AAAA', requestId }, 400, requestId);
    }
    if (dateTo && !isDDMMYYYY(dateTo)) {
      return json({ error: 'invalid_date_format', field: 'dateTo', expected: 'DD/MM/AAAA', requestId }, 400, requestId);
    }

    let query = supabase
      .from('pedidos')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (numero && String(numero).trim()) {
      query = query.ilike('numero', `%${String(numero).trim()}%`);
    }

    if (status && String(status).trim()) {
      // Case-insensitive status match
      query = query.ilike('situacao', `%${String(status).trim()}%`);
    }

    if (integrationAccountId) {
      query = query.eq('integration_account_id', integrationAccountId);
    }

    if (dateFrom) {
      query = query.gte('data_pedido', ddmmyyyyToISO(dateFrom));
    }
    if (dateTo) {
      query = query.lte('data_pedido', ddmmyyyyToISO(dateTo));
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    const { data: pedidos, error, count } = await query.range(start, end);
    if (error) return json({ error: error.message, requestId }, 400, requestId);

    let itens: any[] = [];
    if (expand === 'items' && pedidos && pedidos.length) {
      const numeros = pedidos.map((p: any) => p.numero).filter(Boolean);
      if (numeros.length) {
        const { data: itensData, error: itensErr } = await supabase
          .from('itens_pedidos')
          .select('*')
          .in('numero_pedido', numeros);
        if (itensErr) return json({ error: itensErr.message, requestId }, 400, requestId);
        itens = itensData || [];
      }
    }

    return json({ page, pageSize, total: count || 0, pedidos: pedidos || [], itens, requestId }, 200, requestId);
  } catch (e) {
    return json({ error: String(e), requestId }, 500, requestId);
  }
});

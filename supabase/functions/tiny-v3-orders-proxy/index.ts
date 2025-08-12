// Supabase Edge Function: tiny-v3-orders-proxy
// Calls Tiny Public API v3 Orders endpoints. No DB reads/writes for orders.
// Validates DD/MM/AAAA dates, supports numero search, optional expand=items.
// JWT required (verify_jwt = true). Token from Configurações (tiny_v3_token or tiny_token) per org, with fallback to secret TINY_V3_TOKEN.
// Always returns JSON with CORS and x-request-id.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "x-request-id",
};

function json(body: unknown, status = 200, requestId?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...corsHeaders };
  if (requestId) headers["x-request-id"] = requestId;
  return new Response(JSON.stringify(body), { status, headers });
}

function isDDMMYYYY(s?: string | null): s is string {
  if (!s) return false;
  return /^\d{2}\/\d{2}\/\d{4}$/.test(s);
}

function toISODate(d: string) {
  // DD/MM/AAAA -> YYYY-MM-DD
  const [dd, mm, yyyy] = d.split("/");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeText(s?: string | null) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// UI label/status -> Tiny v3 status code (best-effort based on v2; adjust per swagger if needed)
const UI_TO_TINY_V3: Record<string, string> = {
  "em aberto": "open",
  "aberto": "open",
  "aprovado": "approved",
  "preparando envio": "preparing_shipment",
  "preparando_envio": "preparing_shipment",
  "faturado": "invoiced",
  "pronto para envio": "ready_to_ship",
  "pronto_envio": "ready_to_ship",
  "enviado": "shipped",
  "entregue": "delivered",
  "nao entregue": "not_delivered",
  "nao_entregue": "not_delivered",
  "não entregue": "not_delivered",
  "cancelado": "canceled",
};

function mapStatuses(input?: unknown): string[] {
  const arr = Array.isArray(input) ? input : [];
  const out: string[] = [];
  for (const s of arr as string[]) {
    const n = normalizeText(s);
    if (UI_TO_TINY_V3[n]) out.push(UI_TO_TINY_V3[n]);
    else if (UI_TO_TINY_V3[n.replace(/\s+/g, "_")]) out.push(UI_TO_TINY_V3[n.replace(/\s+/g, "_")]);
  }
  return Array.from(new Set(out));
}

async function backoffFetch(url: string, init: RequestInit, retry = 0): Promise<Response> {
  const resp = await fetch(url, init);
  if (resp.status === 429 && retry < 3) {
    const retryAfter = Number(resp.headers.get("Retry-After")) || 1 + retry;
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return backoffFetch(url, init, retry + 1);
  }
  return resp;
}

async function safeJson(resp: Response) {
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const requestId = crypto.randomUUID();

  try {
    // Accept JSON body or query params
    let body: any = {};
    try { body = await req.json(); } catch (_) {
      const p = new URL(req.url).searchParams;
      body = Object.fromEntries(p.entries());
    }

    const page = Math.max(1, Number(body.page || 1));
    const pageSize = Math.max(1, Math.min(500, Number(body.pageSize || 50)));
    const dateFrom = body.dateFrom as string | undefined;
    const dateTo = body.dateTo as string | undefined;
    const numero = (body.numero as string | undefined)?.trim();
    const expand = String(body.expand || "").toLowerCase();
    const statusesV3 = mapStatuses(body.statuses || body.situacoes || body.status || body.situacao);

    // Validate required dates strictly in DD/MM/AAAA
    if (!isDDMMYYYY(dateFrom)) {
      return json({ error: "invalid_date_format", field: "dateFrom", expected: "DD/MM/AAAA", requestId }, 400, requestId);
    }
    if (!isDDMMYYYY(dateTo)) {
      return json({ error: "invalid_date_format", field: "dateTo", expected: "DD/MM/AAAA", requestId }, 400, requestId);
    }

    // Resolve Tiny token: DB configuracoes then secret fallback
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });

    const { data: cfgList } = await supabase
      .from("configuracoes")
      .select("chave,valor")
      .in("chave", ["tiny_v3_token", "tiny_token"]) // prefer v3-specific
      .limit(10);

    let token = (cfgList || []).find((c: any) => c.chave === "tiny_v3_token" && c.valor)?.valor as string | undefined;
    if (!token) token = (cfgList || []).find((c: any) => c.chave === "tiny_token" && c.valor)?.valor as string | undefined;
    if (!token) token = Deno.env.get("TINY_V3_TOKEN") || undefined;

    if (!token) {
      return json({ error: "missing_tiny_v3_token", details: "Configure tiny_v3_token em Configurações ou a secret TINY_V3_TOKEN.", requestId }, 400, requestId);
    }

    const masked = token.substring(0, 4) + "***" + token.substring(Math.max(0, token.length - 4));
    console.log("tinyv3.invoke", {
      requestId,
      page,
      pageSize,
      hasNumero: !!numero,
      statuses: statusesV3,
      dateRange: [dateFrom, dateTo],
      token: `***${masked.length}***`, // masked length only
    });

    // Build v3 request
    const base = "https://erp.tiny.com.br/public-api/v3";
    const url = new URL(`${base}/orders`);
    // Paging - v3 commonly supports page & limit
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(pageSize));

    // Dates - convert to ISO (YYYY-MM-DD). Param names may vary across resources; we use common ones.
    // If your org requires different keys (issued_at, created_at), adjust here.
    const isoFrom = toISODate(dateFrom!);
    const isoTo = toISODate(dateTo!);
    url.searchParams.set("date_from", isoFrom);
    url.searchParams.set("date_to", isoTo);

    if (numero) url.searchParams.set("number", numero);
    if (statusesV3.length) url.searchParams.set("status", statusesV3.join(","));

    console.log("tinyv3.request:first", { requestId, url: url.toString().replace(token, "***") });

    const listResp = await backoffFetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (listResp.status === 401 || listResp.status === 403) {
      return json({ error: "unauthorized", action: "check_token", requestId }, listResp.status, requestId);
    }

    const listData = await safeJson(listResp);
    // Normalize results + paging
    const orders = (listData?.data?.orders || listData?.orders || listData?.data || listData?.results || []) as any[];
    const total = Number(listData?.data?.total ?? listData?.meta?.total ?? listData?.paging?.total ?? orders.length) || orders.length;

    let results = orders;

    if (expand === "items" && Array.isArray(orders)) {
      const detailed: any[] = [];
      for (const o of orders) {
        const id = o?.id || o?.orderId || o?.numero || o?.numeroPedido;
        if (!id) { detailed.push(o); continue; }
        const detailUrl = new URL(`${base}/orders/${encodeURIComponent(String(id))}`);
        console.log("tinyv3.request:detail", { requestId, id: String(id) });
        const detResp = await backoffFetch(detailUrl.toString(), {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        if (detResp.status === 401 || detResp.status === 403) {
          return json({ error: "unauthorized", action: "check_token", requestId }, detResp.status, requestId);
        }
        const detData = await safeJson(detResp);
        const order = detData?.data?.order || detData?.order || detData?.data || detData;
        detailed.push(order || o);
      }
      results = detailed;
    }

    return json({ results, paging: { total, limit: pageSize, offset: (page - 1) * pageSize }, requestId }, 200, requestId);
  } catch (e) {
    return json({ error: String(e), requestId }, 500, requestId);
  }
});

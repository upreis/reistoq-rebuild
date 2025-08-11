// Supabase Edge Function: tiny-orders-proxy
// Live fetch to Tiny API with strict DD/MM/AAAA validation, pagination cap 500,
// optional numero filter and expand=items. Always JSON + x-request-id and CORS.
// NOTE: Requires the TINY_API_TOKEN to be set as a Function Secret.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
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

function normalizeSituacao(s?: string | null): string {
  if (!s) return "";
  return String(s).trim();
}

function toFormBody(params: Record<string, string | number | undefined>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (typeof v === "undefined" || v === null) return;
    usp.append(k, String(v));
  });
  return usp.toString();
}

async function fetchTiny(
  endpoint: string,
  formParams: Record<string, string | number | undefined>,
  token: string,
  requestId: string,
  retry = 0,
): Promise<Response> {
  const body = toFormBody({ token, formato: "json", ...formParams });
  const resp = await fetch(`https://api.tiny.com.br/api2/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (resp.status === 429 && retry < 3) {
    const retryAfter = Number(resp.headers.get("Retry-After")) || 1 + retry;
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return fetchTiny(endpoint, formParams, token, requestId, retry + 1);
  }
  return resp;
}

async function safeParseJson(resp: Response) {
  const ct = resp.headers.get("content-type") || "";
  const text = await resp.text();
  if (ct.includes("application/json")) {
    try { return JSON.parse(text); } catch (_) { /* fallthrough */ }
  }
  // Non JSON or parse error: encapsulate raw text
  return { raw: text };
}

function extractPedidosAndTotal(retorno: any) {
  // Tiny often returns { retorno: { status, pedidos: [{ pedido: {...} }], registros, pagina, numero_paginas } }
  const pedidosWrapper = retorno?.retorno?.pedidos || [];
  const pedidos = pedidosWrapper.map((p: any) => p?.pedido || p).filter(Boolean);
  const total = Number(retorno?.retorno?.registros ?? retorno?.retorno?.numero_registros ?? pedidos.length) || pedidos.length;
  return { pedidos, total };
}

function pedidoMatchesNumero(pedido: any, numero: string): boolean {
  const n = numero.toLowerCase();
  const fields = [pedido?.numero, pedido?.numero_ecommerce, pedido?.numeroPedido, pedido?.id]?.map((x) => String(x || "").toLowerCase());
  return fields.some((f) => f.includes(n));
}

async function expandPedidoItens(basePedido: any, token: string, requestId: string) {
  const idOrNumero = basePedido?.id || basePedido?.numero;
  if (!idOrNumero) return basePedido; // nothing to expand
  const resp = await fetchTiny("pedido.obter.php", { id: basePedido?.id, numero: basePedido?.numero, com_itens: "S" }, token, requestId);
  const parsed = await safeParseJson(resp);
  const pedido = parsed?.retorno?.pedido || basePedido;
  return pedido;
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
const statusRaw = normalizeSituacao(body.status as string | undefined);
const situacao = normalizeSituacao(body.situacao as string | undefined) || statusRaw;
const numero = body.numero as string | undefined;
const expand = String(body.expand || "").toLowerCase();

    // Validate required dates in DD/MM/AAAA
    if (!isDDMMYYYY(dateFrom)) {
      return json({ error: "invalid_date_format", field: "dateFrom", expected: "DD/MM/AAAA", requestId }, 400, requestId);
    }
    if (!isDDMMYYYY(dateTo)) {
      return json({ error: "invalid_date_format", field: "dateTo", expected: "DD/MM/AAAA", requestId }, 400, requestId);
    }

// Resolve token do Tiny a partir das Configurações (RLS via JWT do chamador)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
});
console.log("tiny-proxy.invoke", { requestId, page, pageSize });
const { data: cfg, error: cfgErr } = await supabase
  .from("configuracoes")
  .select("valor")
  .eq("chave", "tiny_token")
  .single();
if (cfgErr || !cfg?.valor) {
  return json({ error: "missing_tiny_token", details: "Configure o token do Tiny em Configurações", requestId }, 400, requestId);
}
const token = cfg.valor as string;

// Build pesquisa payload
const pesquisaParams: Record<string, string | number | undefined> = {
  pagina: page,
  limite: pageSize,
  dataInicial: dateFrom,
  dataFinal: dateTo,
  situacao: situacao || undefined,
  numero: numero || undefined,
};

console.log("tiny-proxy.call.pesquisa", { requestId, page, pageSize, hasNumero: !!numero });
const resp = await fetchTiny("pedidos.pesquisa.php", pesquisaParams, token, requestId);
const parsed = await safeParseJson(resp);
const tinyStatus = parsed?.retorno?.status;
if (tinyStatus && String(tinyStatus).toUpperCase() !== "OK") {
  return json({ error: "tiny_api_error", details: parsed?.retorno?.erros || parsed, requestId }, 400, requestId);
}
// Extract pedidos and total
let { pedidos, total } = extractPedidosAndTotal(parsed);

    // If Tiny doesn't support numero param, ensure filter client-side
    if (numero) {
      pedidos = pedidos.filter((p: any) => pedidoMatchesNumero(p, numero));
    }

    // Expand items if requested
if (expand === "items" && Array.isArray(pedidos)) {
  const expanded: any[] = [];
  for (const p of pedidos) {
    try {
      console.log("tiny-proxy.call.obter", { requestId, id: p?.id || p?.numero });
      const full = await expandPedidoItens(p, token, requestId);
      expanded.push(full);
    } catch (_) {
      expanded.push(p);
    }
  }
  pedidos = expanded;
}

    return json({ results: pedidos, paging: { total, page, pageSize }, page, pageSize, total, requestId }, 200, requestId);
  } catch (e) {
    return json({ error: String(e), requestId }, 500, requestId);
  }
});

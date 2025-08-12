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

// Normalização básica para status (remove acentos, caixa baixa)
function normalizeText(s: string) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const TINY_CODES = new Set([
  "aberto",
  "aprovado",
  "preparando_envio",
  "faturado",
  "pronto_envio",
  "enviado",
  "entregue",
  "nao_entregue",
  "cancelado",
]);

const UI_TO_TINY: Record<string, string> = {
  // UI label -> Tiny code (normalizados)
  "em aberto": "aberto",
  "aberto": "aberto",
  "aprovado": "aprovado",
  "preparando envio": "preparando_envio",
  "preparando_envio": "preparando_envio",
  "faturado": "faturado",
  "pronto para envio": "pronto_envio",
  "pronto_envio": "pronto_envio",
  "enviado": "enviado",
  "entregue": "entregue",
  "nao entregue": "nao_entregue",
  "nao_entregue": "nao_entregue",
  "não entregue": "nao_entregue",
  "cancelado": "cancelado",
};

function mapUiSituacaoToTiny(s?: string | null): string {
  if (!s) return "";
  const n = normalizeText(String(s));
  // tenta por label
  if (UI_TO_TINY[n]) return UI_TO_TINY[n];
  // tenta por código tiny já normalizado
  if (TINY_CODES.has(n)) return n;
  // tenta trocar espaços por underscore e validar
  const maybe = n.replace(/\s+/g, "_");
  return TINY_CODES.has(maybe) ? maybe : ""; // desconhecido -> ignorar
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

async function expandPedidoItens(basePedido: any, token: string, requestId: string, situacaoParam?: string, statusParam?: string) {
  const id = basePedido?.id;
  if (!id) return basePedido; // nothing to expand
  const form: Record<string, string> = { id: String(id), com_itens: "S" };
  if (situacaoParam) form["situacao"] = String(situacaoParam);
  else if (statusParam) form["status"] = String(statusParam);
  const resp = await fetchTiny("pedido.obter.php", form, token, requestId);
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
const numero = body.numero as string | undefined;
const expand = String(body.expand || "").toLowerCase();

// Preservar situacao/status do chamador apenas para uso em pedido.obter.php
const rawSituacoes: string[] | undefined = Array.isArray(body.situacoes)
  ? body.situacoes
  : (Array.isArray(body.statuses) ? body.statuses : undefined);
const statusRaw = normalizeSituacao(body.status as string | undefined);
const situacaoSingleRaw = normalizeSituacao(body.situacao as string | undefined) || statusRaw;
const collected = (rawSituacoes && rawSituacoes.length)
  ? rawSituacoes
  : (situacaoSingleRaw ? [situacaoSingleRaw] : []);
const statusesTiny: string[] = (collected || []).map(mapUiSituacaoToTiny).filter(Boolean);
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

// Consulta única seguindo regra: pedidos.pesquisa.php usa apenas token, formato=json, dataInicio, dataFinal e pagina
const situacaoToUse = statusesTiny[0] || mapUiSituacaoToTiny((body.situacao || body.status) as string | undefined);

const pesquisaParams: Record<string, string | number | undefined> = {
  pagina: page,
  dataInicio: dateFrom,
  dataFinal: dateTo,
  // NÃO enviar: numero, situacao/status, limite
};
console.log("tiny-proxy.call.pesquisa", { requestId, page, pageSize, hasNumero: !!numero });
const resp = await fetchTiny("pedidos.pesquisa.php", pesquisaParams, token, requestId);
const parsed = await safeParseJson(resp);
const tinyStatus = parsed?.retorno?.status;
if (tinyStatus && String(tinyStatus).toUpperCase() !== "OK") {
  return json({ error: "tiny_api_error", details: parsed?.retorno?.erros || parsed, requestId }, 400, requestId);
}

let { pedidos, total } = extractPedidosAndTotal(parsed);

// Expandir itens via pedido.obter.php com com_itens=S e opcional situacao/status
if (expand === "items" && Array.isArray(pedidos)) {
  const expanded: any[] = [];
  for (const p of pedidos) {
    try {
      console.log("tiny-proxy.call.obter", { requestId, id: p?.id });
      const full = await expandPedidoItens(p, token, requestId, situacaoToUse, situacaoToUse);
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

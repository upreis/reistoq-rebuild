// Supabase Edge Function: Proxy de pedidos Mercado Livre
// Usa o token salvo em integration_accounts para consultar pedidos diretamente na API do ML

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ML_APP_ID = Deno.env.get('ML_APP_ID')!;
const ML_APP_SECRET = Deno.env.get('ML_APP_SECRET')!;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function json(body: any, status = 200) { const reqId = (crypto as any)?.randomUUID?.() || String(Date.now()); return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "x-request-id": reqId, ...CORS } }); }

// Backoff helper for 429 rate limits with Retry-After support
async function fetchWithBackoff(url: string, init: RequestInit, maxRetries = 5, baseMs = 500, capMs = 8000): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const resp = await fetch(url, init);
    if (resp.status !== 429) return resp;

    const retryAfter = resp.headers.get('retry-after');
    let delay = 0;
    if (retryAfter) {
      const secs = Number(retryAfter);
      if (!Number.isNaN(secs)) delay = secs * 1000;
    }
    if (delay === 0) {
      const jitter = Math.random() * 200;
      delay = Math.min(baseMs * 2 ** attempt, capMs) + jitter;
    }
    await new Promise((r) => setTimeout(r, delay));
  }
  // Last attempt without waiting
  return await fetch(url, init);
}

async function getActiveMLAccount(supabase: any, userId: string) {
  const { data: profile, error: pErr } = await supabase.from('profiles').select('organizacao_id').eq('id', userId).single();
  if (pErr || !profile?.organizacao_id) throw new Error('Organização não encontrada');
  const { data: accs, error } = await supabase
    .from('integration_accounts')
    .select('*')
    .eq('organization_id', profile.organizacao_id)
    .eq('provider', 'mercadolivre')
    .eq('is_active', true)
    .limit(1);
  if (error || !accs || accs.length === 0) throw new Error('Nenhuma conta Mercado Livre ativa');
  return accs[0];
}

async function getAllActiveMLAccounts(supabase: any, userId: string) {
  const { data: profile, error: pErr } = await supabase.from('profiles').select('organizacao_id').eq('id', userId).single();
  if (pErr || !profile?.organizacao_id) throw new Error('Organização não encontrada');
  const { data: accs, error } = await supabase
    .from('integration_accounts')
    .select('*')
    .eq('organization_id', profile.organizacao_id)
    .eq('provider', 'mercadolivre')
    .eq('is_active', true);
  if (error || !accs || accs.length === 0) throw new Error('Nenhuma conta Mercado Livre ativa');
  return accs;
}

async function getMLAccountById(supabase: any, userId: string, accountId: string) {
  const { data: profile, error: pErr } = await supabase.from('profiles').select('organizacao_id').eq('id', userId).single();
  if (pErr || !profile?.organizacao_id) throw new Error('Organização não encontrada');
  const { data: acc, error } = await supabase
    .from('integration_accounts')
    .select('*')
    .eq('id', accountId)
    .eq('organization_id', profile.organizacao_id)
    .eq('provider', 'mercadolivre')
    .single();
  if (error || !acc) throw new Error('Conta Mercado Livre não encontrada');
  return acc;
}


async function refreshIfNeeded(acc: any) {
  try {
    const now = Date.now();
    const expiresAtMs = acc?.auth_data?.expires_at ? Date.parse(acc.auth_data.expires_at) : 0;
    if (expiresAtMs && expiresAtMs - now > 5 * 60 * 1000) return acc; // válido por >5min
    if (!acc?.auth_data?.refresh_token) return acc;

    const body = new URLSearchParams();
    body.set('grant_type', 'refresh_token');
    body.set('client_id', ML_APP_ID);
    body.set('client_secret', ML_APP_SECRET);
    body.set('refresh_token', acc.auth_data.refresh_token);

    const resp = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const raw = await resp.text();
    let json: any = null;
    try { json = raw ? JSON.parse(raw) : null; } catch (_) { json = { raw }; }
    if (!resp.ok) return acc; // fallback silencioso; uma 401 no fluxo principal tentará novamente

    const { access_token, refresh_token, expires_in } = json || {};
    const expires_at = new Date(Date.now() + Number(expires_in || 0) * 1000).toISOString();

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const nextAuth = {
      ...(acc.auth_data || {}),
      access_token,
      refresh_token: refresh_token || acc.auth_data.refresh_token,
      expires_at,
    };
    await admin.from('integration_accounts').update({ auth_data: nextAuth }).eq('id', acc.id);
    return { ...acc, auth_data: nextAuth };
  } catch (_) {
    return acc;
  }
}


// Force a refresh now (rotates refresh_token if returned)
async function refreshNow(acc: any) {
  try {
    if (!acc?.auth_data?.refresh_token) return acc;
    const body = new URLSearchParams();
    body.set('grant_type', 'refresh_token');
    body.set('client_id', ML_APP_ID);
    body.set('client_secret', ML_APP_SECRET);
    body.set('refresh_token', acc.auth_data.refresh_token);
    const resp = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString(),
    });
    const txt = await resp.text();
    let json: any = null; try { json = txt ? JSON.parse(txt) : null; } catch (_) { json = { raw: txt }; }
    if (!resp.ok) return acc;
    const { access_token, refresh_token, expires_in } = json || {};
    const expires_at = new Date(Date.now() + Number(expires_in || 0) * 1000).toISOString();
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const nextAuth = { ...(acc.auth_data || {}), access_token, refresh_token: refresh_token || acc.auth_data.refresh_token, expires_at };
    await admin.from('integration_accounts').update({ auth_data: nextAuth }).eq('id', acc.id);
    return { ...acc, auth_data: nextAuth };
  } catch (_) { return acc; }
}

// Fetch with single 401 retry using refresh_token
async function mlFetchWith401Retry(acc: any, url: string): Promise<{ resp: Response, acc: any }> {
  let resp = await fetchWithBackoff(url, { headers: { Authorization: `Bearer ${acc?.auth_data?.access_token}` } });
  if (resp.status === 401) {
    const acc2 = await refreshNow(acc);
    const resp2 = await fetchWithBackoff(url, { headers: { Authorization: `Bearer ${acc2?.auth_data?.access_token}` } });
    return { resp: resp2, acc: acc2 };
  }
  return { resp, acc };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: req.headers.get('authorization') || '' } } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'Não autenticado' }, 401);

  try {
    const params = new URL(req.url).searchParams;
    const accountId = params.get('account_id');
    const all = params.get('all') === 'true';
    const expandParam = params.get('expand') || '';
    const expandSet = new Set(expandParam.split(',').map(s => s.trim()).filter(Boolean));
    const sort = params.get('sort') || 'date_desc';
    const defaultLimit = Math.max(1, Math.min(100, Number(Deno.env.get('ML_PAGE_SIZE') || '100')));
    const limit = Math.max(1, Math.min(100, Number(params.get('limit') || String(defaultLimit))));
    const offset = Math.max(0, Number(params.get('offset') || '0'));

    const from = params.get('from');
    const to = params.get('to');
    const status = params.get('status');
    const logisticsType = params.get('logistics_type');

    const buildQS = (seller?: string) => {
      const qs = new URLSearchParams();
      if (seller) qs.set('seller', String(seller));
      if (from) qs.set('order.date_created.from', `${from}T00:00:00.000-00:00`);
      if (to) qs.set('order.date_created.to', `${to}T23:59:59.000-00:00`);
      if (status) qs.set('order.status', status);
      if (logisticsType) qs.set('logistics_type', logisticsType);
      qs.set('sort', sort);
      qs.set('limit', String(limit));
      qs.set('offset', String(offset));
      return qs;
    };

    if (all) {
      const accounts = await getAllActiveMLAccounts(supabase, user.id);
      const refreshed = await Promise.all(accounts.map((a: any) => refreshIfNeeded(a)));

      const perAcc = await Promise.all(refreshed.map(async (acc: any) => {
        const qs = buildQS(acc?.account_identifier);
        const { resp, acc: acc2 } = await mlFetchWith401Retry(acc, `https://api.mercadolibre.com/orders/search?${qs.toString()}`);
        const raw = await resp.text();
        let body: any = null;
        try { body = raw ? JSON.parse(raw) : null; } catch (_) { body = { raw }; }
        if (resp.status === 401) {
          body = { error: 'token_expired', action: 'reconnect' };
        }
        return { acc: acc2, ok: resp.ok, body };
      }));

      const errors = perAcc.filter(x => !x.ok).map(x => ({ account_id: x.acc?.id, details: x.body }));
      let combined = perAcc
        .filter(x => x.ok && Array.isArray(x.body?.results))
        .flatMap(x => (x.body.results as any[]).map(o => ({ order: o, __acc_id: x.acc?.id, __token: x.acc?.auth_data?.access_token })));

      // Ordenar por data de criação descendente (quando disponível)
      combined.sort((a, b) => {
        const da = Date.parse(a.order?.date_created || a.order?.order?.date_created || '');
        const db = Date.parse(b.order?.date_created || b.order?.order?.date_created || '');
        return (db || 0) - (da || 0);
      });

      let total = combined.length;
      let sliced = combined.slice(offset, offset + limit);

      // Optional filter by logistics_type using shipments API when needed
      if (logisticsType) {
        const filtered: any[] = [];
        for (const entry of sliced) {
          const ord = entry.order;
          const lt =
            ord?.shipping?.logistic_type ||
            ord?.shipping?.logistics_type ||
            ord?._details?.shipping?.logistic_type ||
            ord?.logistic_type;
          if (lt) {
            if (String(lt).toLowerCase() === String(logisticsType).toLowerCase()) filtered.push(entry);
            continue;
          }
          const shipId = ord?.shipping?.id || ord?._details?.shipping?.id;
          if (shipId) {
            try {
              const r = await fetchWithBackoff(`https://api.mercadolibre.com/shipments/${shipId}`, {
                headers: { Authorization: `Bearer ${entry.__token}` },
              });
const rawSd = await r.text();
let sd: any = null;
try { sd = rawSd ? JSON.parse(rawSd) : null; } catch (_) { sd = { raw: rawSd }; }
              if (sd?.logistic_type && String(sd.logistic_type).toLowerCase() === String(logisticsType).toLowerCase()) {
                entry.order = { ...ord, _shipping: sd };
                filtered.push(entry);
              }
            } catch (_) { /* ignore */ }
          }
        }
        sliced = filtered;
        total = sliced.length;
      }

      // expand=details opcional
      if (expandSet.has('details')) {
        for (let i = 0; i < sliced.length; i++) {
          const ord = sliced[i].order;
          const id = ord?.id || ord?.order?.id;
          if (!id) continue;
          try {
            const resp = await fetchWithBackoff(`https://api.mercadolibre.com/orders/${id}`, {
              headers: { Authorization: `Bearer ${sliced[i].__token}` },
            });
const rawDet = await resp.text();
let det: any = null;
try { det = rawDet ? JSON.parse(rawDet) : null; } catch (_) { det = { raw: rawDet }; }
            sliced[i].order = { ...ord, _details: det };
          } catch (_) { /* ignore detail errors */ }
        }
      }

      const results = sliced.map(x => x.order);
      return json({ aggregated: true, results, paging: { total, limit, offset }, errors: errors.length ? errors : undefined });
    }

    // Single account path (default)
    let acc = accountId ? await getMLAccountById(supabase, user.id, accountId) : await getActiveMLAccount(supabase, user.id);
    acc = await refreshIfNeeded(acc);

    const qs = buildQS(acc?.account_identifier);
    const { resp: mlResp, acc: acc2 } = await mlFetchWith401Retry(acc, `https://api.mercadolibre.com/orders/search?${qs.toString()}`);
    acc = acc2;
const rawBody = await mlResp.text();
let jsonBody: any = null;
try { jsonBody = rawBody ? JSON.parse(rawBody) : null; } catch (_) { jsonBody = { raw: rawBody }; }
if (!mlResp.ok) {
  const status = mlResp.status;
  if (status === 401) {
    const reqId = (crypto as any)?.randomUUID?.() || String(Date.now());
    return new Response(JSON.stringify({ error: 'token_expired', action: 'reconnect', requestId: reqId }), { status: 401, headers: { 'Content-Type': 'application/json', 'x-request-id': reqId, ...CORS } });
  }
  const err = (jsonBody && (jsonBody.error || jsonBody.message || (jsonBody.cause && JSON.stringify(jsonBody.cause)))) || rawBody || 'Erro desconhecido';
  return json({ error: 'Falha na API ML', status, details: err }, 400);
}

    if (expandSet.has('details') && Array.isArray(jsonBody?.results)) {
      for (let i = 0; i < jsonBody.results.length; i++) {
        const ord = jsonBody.results[i];
        const id = ord?.id || ord?.order?.id;
        if (!id) continue;
        try {
          const resp = await fetchWithBackoff(`https://api.mercadolibre.com/orders/${id}`, {
            headers: { Authorization: `Bearer ${acc?.auth_data?.access_token}` },
          });
const rawDet2 = await resp.text();
let det: any = null;
try { det = rawDet2 ? JSON.parse(rawDet2) : null; } catch (_) { det = { raw: rawDet2 }; }
          jsonBody.results[i] = { ...ord, _details: det };
        } catch (_) { /* ignore detail errors */ }
      }
    }

    // Optional filter by logistics_type (fulfillment, cross_docking, etc.)
    if (params.get('logistics_type') && Array.isArray(jsonBody?.results)) {
      const lt = String(params.get('logistics_type')).toLowerCase();
      const filtered: any[] = [];
      for (const ord of jsonBody.results) {
        const localLt =
          ord?.shipping?.logistic_type ||
          ord?.shipping?.logistics_type ||
          ord?._details?.shipping?.logistic_type ||
          ord?.logistic_type;
        if (localLt) {
          if (String(localLt).toLowerCase() === lt) filtered.push(ord);
          continue;
        }
        const shipId = ord?.shipping?.id || ord?._details?.shipping?.id;
        if (shipId) {
          try {
            const r = await fetchWithBackoff(`https://api.mercadolibre.com/shipments/${shipId}`, {
              headers: { Authorization: `Bearer ${acc?.auth_data?.access_token}` },
            });
const rawSd2 = await r.text();
let sd: any = null;
try { sd = rawSd2 ? JSON.parse(rawSd2) : null; } catch (_) { sd = { raw: rawSd2 }; }
            if (sd?.logistic_type && String(sd.logistic_type).toLowerCase() === lt) {
              filtered.push({ ...ord, _shipping: sd });
            }
          } catch (_) { /* ignore */ }
        }
      }
      jsonBody.results = filtered;
      if (jsonBody.paging) jsonBody.paging.total = filtered.length;
    }

    return json(jsonBody);
  } catch (e) {
    return json({ error: String(e) }, 400);
  }
});

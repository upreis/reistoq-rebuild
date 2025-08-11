// Supabase Edge Function: Proxy de pedidos Mercado Livre
// Usa o token salvo em integration_accounts para consultar pedidos diretamente na API do ML

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ML_PAGE_SIZE = Number(Deno.env.get("ML_PAGE_SIZE") || "100");
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Expose-Headers": "x-request-id",
};

function json(body: any, status = 200, reqId?: string) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS, ...(reqId ? { "x-request-id": reqId } : {}) } }); }

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
async function refreshIfNeeded(acc: any, reqId: string, service?: any) {
  const now = Date.now();
  const expiresAt = acc?.auth_data?.expires_at ? Date.parse(acc.auth_data.expires_at) : 0;
  const msLeft = expiresAt ? expiresAt - now : 0;
  if (msLeft > 5 * 60 * 1000) return acc; // válido por >5min
  if (!acc?.auth_data?.refresh_token) return acc;
  return await refreshNow(acc, reqId, service);
}

async function refreshNow(acc: any, reqId: string, service?: any) {
  try {
    const client_id = Deno.env.get('ML_APP_ID')!;
    const client_secret = Deno.env.get('ML_APP_SECRET')!;
    const form = new URLSearchParams();
    form.set('grant_type', 'refresh_token');
    form.set('client_id', client_id);
    form.set('client_secret', client_secret);
    form.set('refresh_token', acc?.auth_data?.refresh_token || '');

    console.log(`[${reqId}] ml.refreshNow.oauth`);
    const resp = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString(),
    });
    const body = await resp.json();
    if (!resp.ok) throw new Error(`refresh_failed: ${resp.status}`);

    const updated = {
      ...acc,
      auth_data: {
        ...(acc.auth_data || {}),
        access_token: body.access_token,
        refresh_token: body.refresh_token || acc.auth_data?.refresh_token,
        expires_in: body.expires_in,
        expires_at: new Date(Date.now() + (Number(body.expires_in || 0) * 1000)).toISOString(),
      },
    };

    // Persist via service role
    const serviceSupabase = service || createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await serviceSupabase.from('integration_accounts').update({ auth_data: updated.auth_data }).eq('id', acc.id);
    console.log(`[${reqId}] ml.refreshNow.updated`);
    return updated;
  } catch (e) {
    console.log(`[${reqId}] ml.refreshNow.error`, String(e));
    return acc;
  }
}

async function mlFetchWith401Retry(url: string, token: string, reqId: string, acc: any, service?: any, init: RequestInit = {}) {
  console.log(`[${reqId}] mlFetchWith401Retry:first ${url.split('?')[0]}`);
  let resp = await fetchWithBackoff(url, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` } });
  if (resp.status !== 401) return { resp, acc };
  // try refresh once
  const refreshed = await refreshNow(acc, reqId, service);
  console.log(`[${reqId}] mlFetchWith401Retry:retry`);
  resp = await fetchWithBackoff(url, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${refreshed?.auth_data?.access_token}` } });
  return { resp, acc: refreshed };
}
serve(async (req) => {
  const reqId = crypto.randomUUID();
  if (req.method === 'OPTIONS') return new Response(null, { headers: { ...CORS, 'x-request-id': reqId } });

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: req.headers.get('authorization') || '' } } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'Não autenticado', requestId: reqId }, 401, reqId);

  try {
    const params = new URL(req.url).searchParams;
    const accountId = params.get('account_id');
    const all = params.get('all') === 'true';
    const expandParam = params.get('expand') || '';
    const expandSet = new Set(expandParam.split(',').map(s => s.trim()).filter(Boolean));
    const rawLimit = Math.max(1, Math.min(1000, Number(params.get('limit') || '50')));
    const limit = Math.max(1, Math.min(ML_PAGE_SIZE, rawLimit));
    const offset = Math.max(0, Number(params.get('offset') || '0'));

    const from = params.get('from');
    const to = params.get('to');
    const status = params.get('status');

    const buildQS = (seller?: string) => {
      const qs = new URLSearchParams();
      if (seller) qs.set('seller', String(seller));
      if (from) qs.set('order.date_created.from', `${from}T00:00:00.000-00:00`);
      if (to) qs.set('order.date_created.to', `${to}T23:59:59.000-00:00`);
      if (status) qs.set('order.status', status);
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
        const resp = await fetchWithBackoff(`https://api.mercadolibre.com/orders/search?${qs.toString()}`, {
          headers: { Authorization: `Bearer ${acc?.auth_data?.access_token}` },
        });
        const body = await resp.json();
        return { acc, ok: resp.ok, body };
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

      const total = combined.length;
      const sliced = combined.slice(offset, offset + limit);

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
            const det = await resp.json();
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
    const mlResp = await fetchWithBackoff(`https://api.mercadolibre.com/orders/search?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${acc?.auth_data?.access_token}` },
    });
    const jsonBody = await mlResp.json();
    if (!mlResp.ok) return json({ error: 'Falha na API ML', details: jsonBody }, 400);

    if (expandSet.has('details') && Array.isArray(jsonBody?.results)) {
      for (let i = 0; i < jsonBody.results.length; i++) {
        const ord = jsonBody.results[i];
        const id = ord?.id || ord?.order?.id;
        if (!id) continue;
        try {
          const resp = await fetchWithBackoff(`https://api.mercadolibre.com/orders/${id}`, {
            headers: { Authorization: `Bearer ${acc?.auth_data?.access_token}` },
          });
          const det = await resp.json();
          jsonBody.results[i] = { ...ord, _details: det };
        } catch (_) { /* ignore detail errors */ }
      }
    }

    return json(jsonBody);
  } catch (e) {
    return json({ error: String(e) }, 400);
  }
});

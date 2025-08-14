// Supabase Edge Function: Proxy de pedidos Mercado Livre
// Usa o token salvo em integration_accounts para consultar pedidos diretamente na API do ML

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function json(body: any, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } }); }

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

async function getMLAccountsByIds(supabase: any, userId: string, ids: string[]) {
  const { data: profile, error: pErr } = await supabase.from('profiles').select('organizacao_id').eq('id', userId).single();
  if (pErr || !profile?.organizacao_id) throw new Error('Organização não encontrada');
  const { data: accs, error } = await supabase
    .from('integration_accounts')
    .select('*')
    .eq('organization_id', profile.organizacao_id)
    .eq('provider', 'mercadolivre')
    .eq('is_active', true)
    .in('id', ids);
  if (error) throw error;
  return accs || [];
}

async function refreshIfNeeded(svc: any, accountId: string, secret: any) {
  if (!secret?.expires_at || !secret?.refresh_token) return secret;
  
  const now = Date.now();
  const expiresAt = new Date(secret.expires_at).getTime();
  
  // Se válido por mais de 5 minutos, não precisa refresh
  if (expiresAt - now > 5 * 60 * 1000) return secret;
  
  const ML_APP_ID = Deno.env.get("ML_APP_ID");
  const ML_APP_SECRET = Deno.env.get("ML_APP_SECRET");
  
  if (!ML_APP_ID || !ML_APP_SECRET) return secret;
  
  try {
    const form = new URLSearchParams();
    form.set('grant_type', 'refresh_token');
    form.set('client_id', ML_APP_ID);
    form.set('client_secret', ML_APP_SECRET);
    form.set('refresh_token', secret.refresh_token);

    const resp = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    
    const tokenJson = await resp.json();
    if (!resp.ok) {
      console.error('Falha no refresh ML:', tokenJson);
      return secret;
    }

    const access_token = tokenJson.access_token;
    const refresh_token = tokenJson.refresh_token || secret.refresh_token;
    const expires_in = tokenJson.expires_in;
    const expires_at = expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : secret.expires_at;

    // Atualizar no banco usando função segura
    await svc.rpc('update_integration_secret_secure', {
      account_id: accountId,
      provider_name: 'mercadolivre',
      new_access_token: access_token,
      new_refresh_token: refresh_token,
      new_expires_at: expires_at
    });

    return { ...secret, access_token, refresh_token, expires_at };
  } catch (e) {
    console.error('Erro ao refreshar token ML:', e);
    return secret;
  }
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
    const limit = Math.max(1, Math.min(50, Number(params.get('limit') || '50')));
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

    // Lista específica de contas (account_ids=uuid1,uuid2,...)
    const accountIdsStr = params.get('account_ids') || '';
    const accountIds = accountIdsStr.split(',').map(s => s.trim()).filter(Boolean);

    if (accountIds.length > 0) {
      const accounts = await getMLAccountsByIds(supabase, user.id, accountIds);
      const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const perAcc = await Promise.all(accounts.map(async (acc: any) => {
        const { data: secData } = await svc.rpc('get_integration_secret_secure', {
          account_id: acc.id,
          provider_name: 'mercadolivre',
          requesting_function: 'mercadolivre-orders-proxy'
        });
        const sec = secData && secData.length > 0 ? secData[0] : null;
        
        // Refresh token se necessário
        const refreshedSec = await refreshIfNeeded(svc, acc.id, sec);
        
        const qs = buildQS(acc?.account_identifier);
        const resp = await fetchWithBackoff(`https://api.mercadolibre.com/orders/search?${qs.toString()}`, {
          headers: { Authorization: `Bearer ${refreshedSec?.access_token || ''}` },
        });
        const body = await resp.json();
        return { acc, ok: resp.ok, body, __token: refreshedSec?.access_token };
      }));

      const errors = perAcc.filter(x => !x.ok).map(x => ({ account_id: x.acc?.id, details: x.body }));
      let combined = perAcc
        .filter(x => x.ok && Array.isArray(x.body?.results))
        .flatMap(x => (x.body.results as any[]).map(o => ({ order: o, __acc_id: x.acc?.id, __token: x.__token })));

      // Ordenar por data de criação desc
      combined.sort((a, b) => {
        const da = Date.parse(a.order?.date_created || a.order?.order?.date_created || '');
        const db = Date.parse(b.order?.date_created || b.order?.order?.date_created || '');
        return (db || 0) - (da || 0);
      });

      const total = combined.length;
      const sliced = combined.slice(offset, offset + limit);

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
          } catch (_) { /* ignore */ }
        }
      }

      const results = sliced.map(x => x.order);
      return json({ aggregated: true, results, paging: { total, limit, offset }, errors: errors.length ? errors : undefined });
    }

    if (all) {
      const accounts = await getAllActiveMLAccounts(supabase, user.id);
      const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const perAcc = await Promise.all(accounts.map(async (acc: any) => {
        const { data: secData } = await svc.rpc('get_integration_secret_secure', {
          account_id: acc.id,
          provider_name: 'mercadolivre',
          requesting_function: 'mercadolivre-orders-proxy'
        });
        const sec = secData && secData.length > 0 ? secData[0] : null;
        
        // Refresh token se necessário
        const refreshedSec = await refreshIfNeeded(svc, acc.id, sec);
        
        const qs = buildQS(acc?.account_identifier);
        const resp = await fetchWithBackoff(`https://api.mercadolibre.com/orders/search?${qs.toString()}`, {
          headers: { Authorization: `Bearer ${refreshedSec?.access_token || ''}` },
        });
        const body = await resp.json();
        return { acc, ok: resp.ok, body, __token: refreshedSec?.access_token };
      }));

      const errors = perAcc.filter(x => !x.ok).map(x => ({ account_id: x.acc?.id, details: x.body }));
      let combined = perAcc
        .filter(x => x.ok && Array.isArray(x.body?.results))
        .flatMap(x => (x.body.results as any[]).map(o => ({ order: o, __acc_id: x.acc?.id, __token: x.__token })));

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

    const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: secData } = await svc.rpc('get_integration_secret_secure', {
      account_id: acc.id,
      provider_name: 'mercadolivre',
      requesting_function: 'mercadolivre-orders-proxy'
    });
    const sec = secData && secData.length > 0 ? secData[0] : null;

    // Refresh token se necessário
    const refreshedSec = await refreshIfNeeded(svc, acc.id, sec);

    const qs = buildQS(acc?.account_identifier);
    const mlResp = await fetchWithBackoff(`https://api.mercadolibre.com/orders/search?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${refreshedSec?.access_token || ''}` },
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
            headers: { Authorization: `Bearer ${refreshedSec?.access_token || ''}` },
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

// Supabase Edge Function: Refresh Mercado Livre tokens
// POST: optionally { account_id: uuid, force: boolean }
// Refreshes access_token using refresh_token and updates integration_accounts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ML_APP_ID = Deno.env.get("ML_APP_ID");
const ML_APP_SECRET = Deno.env.get("ML_APP_SECRET");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey, x-app-origin",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  if (!ML_APP_ID || !ML_APP_SECRET) return json({ error: 'Configure ML_APP_ID e ML_APP_SECRET' }, 500);

  const authHeader = req.headers.get('authorization') || '';
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'Não autenticado' }, 401);

  let body: any = {};
  try { body = await req.json(); } catch {}
  const accountId = body?.account_id as string | undefined;
  const force = !!body?.force;

  // Buscar contas ML acessíveis ao usuário (RLS cuida da organização)
  let query = supabase
    .from('integration_accounts')
    .select('id, provider, organization_id, account_identifier')
    .eq('provider', 'mercadolivre');
  if (accountId) query = query.eq('id', accountId);

  const { data: accounts, error } = await query;
  if (error) return json({ error: 'Falha ao listar contas', details: error.message }, 500);

  const svc = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const results: any[] = [];
  for (const acc of accounts || []) {
    // Buscar segredos
    const { data: secret } = await svc
      .from('integration_secrets')
      .select('id, access_token, refresh_token, expires_at')
      .eq('integration_account_id', acc.id)
      .eq('provider', 'mercadolivre')
      .maybeSingle();

    const expiresAt = secret?.expires_at ? new Date(secret.expires_at as string).getTime() : 0;
    const needs = force || !expiresAt || (expiresAt - Date.now() < 5 * 60 * 1000);
    if (!needs) {
      results.push({ id: acc.id, refreshed: false, reason: 'valid' });
      continue;
    }
    if (!secret?.refresh_token) {
      results.push({ id: acc.id, refreshed: false, error: 'Sem refresh_token salvo' });
      continue;
    }

    const form = new URLSearchParams();
    form.set('grant_type', 'refresh_token');
    form.set('client_id', ML_APP_ID);
    form.set('client_secret', ML_APP_SECRET);
    form.set('refresh_token', secret.refresh_token as string);

    const resp = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const tokenJson = await resp.json();
    if (!resp.ok) {
      results.push({ id: acc.id, refreshed: false, error: 'Falha no refresh', details: tokenJson });
      continue;
    }

    const access_token = tokenJson.access_token as string;
    const refresh_token = (tokenJson.refresh_token as string | undefined) || (secret.refresh_token as string);
    const expires_in = tokenJson.expires_in as number | undefined;
    const expires_at = expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : (secret.expires_at as string | null);

    const { error: upErr } = await svc
      .from('integration_secrets')
      .update({ access_token, refresh_token, expires_at, updated_at: new Date().toISOString() })
      .eq('integration_account_id', acc.id)
      .eq('provider', 'mercadolivre');
    if (upErr) {
      results.push({ id: acc.id, refreshed: false, error: upErr.message });
    } else {
      results.push({ id: acc.id, refreshed: true, expires_at });
    }
  }

  const summary = {
    processed: (accounts || []).length,
    refreshed: results.filter(r => r.refreshed).length,
    results,
  };
  return json(summary);
});

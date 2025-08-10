// Supabase Edge Function: Proxy de pedidos Mercado Livre
// Usa o token salvo em integration_accounts para consultar pedidos diretamente na API do ML

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function json(body: any, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } }); }

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

async function refreshIfNeeded(acc: any) {
  const now = Date.now();
  const expiresAt = acc?.auth_data?.expires_at ? Date.parse(acc.auth_data.expires_at) : 0;
  if (expiresAt && expiresAt - now > 60 * 1000) return acc; // válido >60s
  if (!acc?.auth_data?.refresh_token) return acc;
  // NOTE: refresh é feito no endpoint /oauth/token com grant_type=refresh_token, mas precisamos do client_id/secret
  // Para simplificar, deixamos o refresh para uma iteração futura; o token pode ainda estar válido.
  return acc;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: req.headers.get('authorization') || '' } } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'Não autenticado' }, 401);

  try {
    let acc = await getActiveMLAccount(supabase, user.id);
    acc = await refreshIfNeeded(acc);

    const params = new URL(req.url).searchParams;
    const from = params.get('from');
    const to = params.get('to');
    const status = params.get('status');

    const qs = new URLSearchParams();
    if (acc?.account_identifier) qs.set('seller', String(acc.account_identifier));
    if (from) qs.set('order.date_created.from', `${from}T00:00:00.000-00:00`);
    if (to) qs.set('order.date_created.to', `${to}T23:59:59.000-00:00`);
    if (status) qs.set('order.status', status);

    const mlResp = await fetch(`https://api.mercadolibre.com/orders/search?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${acc?.auth_data?.access_token}` },
    });
    const jsonBody = await mlResp.json();
    if (!mlResp.ok) return json({ error: 'Falha na API ML', details: jsonBody }, 400);
    return json(jsonBody);
  } catch (e) {
    return json({ error: String(e) }, 400);
  }
});

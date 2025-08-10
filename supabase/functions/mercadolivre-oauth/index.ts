// Supabase Edge Function: Mercado Livre OAuth helper
// - GET ?action=auth-url -> retorna URL de autorização com state (JWT atual codificado)
// - GET /callback?code=...&state=... -> troca o code por token e salva em integration_accounts

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

function b64(s: string) { return btoa(s); }
function b64d(s: string) { try { return atob(s); } catch { return ""; } }
// URL-safe base64 encoder for bytes (used by PKCE)
function b64url(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
}

async function getOrgIdForUser(supabase: any, userId: string) {
  const { data, error } = await supabase.from('profiles').select('organizacao_id').eq('id', userId).single();
  if (error || !data?.organizacao_id) throw new Error('Organização não encontrada para o usuário');
  return data.organizacao_id as string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const path = url.pathname; // .../mercadolivre-oauth or .../mercadolivre-oauth/callback
  const action = url.searchParams.get('action');

  if (!ML_APP_ID || !ML_APP_SECRET) {
    return json({ error: 'Configure ML_APP_ID e ML_APP_SECRET nos Secrets das Edge Functions.' }, 500);
  }

  if (action === 'auth-url') {
    // Lê JWT do header Authorization e inclui no state
    const auth = req.headers.get('authorization') || '';
    const appOrigin = req.headers.get('x-app-origin') || req.headers.get('referer') || '';
    const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : '';

    // PKCE: gerar code_verifier e code_challenge (S256)
    const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
    const code_verifier = b64url(verifierBytes);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code_verifier));
    const code_challenge = b64url(new Uint8Array(digest));

    const state = b64(JSON.stringify({ t: jwt, ts: Date.now(), o: appOrigin, v: code_verifier }));
    const redirectUri = `${SUPABASE_URL}/functions/v1/mercadolivre-oauth/callback`;
    const authorizeUrl = new URL('https://auth.mercadolivre.com.br/authorization');
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('client_id', ML_APP_ID);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('code_challenge', code_challenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');
    return json({ url: authorizeUrl.toString(), redirect_uri: redirectUri });
  }

  if (path.endsWith('/callback')) {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state') || '';
    const parsed = JSON.parse(b64d(state) || '{}');
    const jwt: string = parsed?.t || '';

    if (!code) return json({ error: 'Código ausente' }, 400);

    // Exchange code -> token
    const redirectUri = `${SUPABASE_URL}/functions/v1/mercadolivre-oauth/callback`;
    const form = new URLSearchParams();
    form.set('grant_type', 'authorization_code');
    form.set('client_id', ML_APP_ID);
    form.set('client_secret', ML_APP_SECRET);
    form.set('code', code);
    form.set('redirect_uri', redirectUri);
    if (parsed?.v) form.set('code_verifier', parsed.v);

    const tokenResp = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const tokenJson = await tokenResp.json();
    if (!tokenResp.ok) {
      console.error('Erro token ML:', tokenJson);
      return json({ error: 'Falha ao obter token do Mercado Livre', details: tokenJson }, 500);
    }

    const access_token = tokenJson.access_token as string;
    const refresh_token = tokenJson.refresh_token as string | undefined;
    const user_id = tokenJson.user_id as string | number | undefined;
    const expires_in = tokenJson.expires_in as number | undefined;
    const expires_at = expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null;

    // Supabase client como o usuário (via JWT no state)
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: jwt ? `Bearer ${jwt}` : '' } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Usuário não autenticado no callback' }, 401);

    try {
      const orgId = await getOrgIdForUser(supabase, user.id);
      const base = {
        organization_id: orgId,
        provider: 'mercadolivre',
        name: `ML ${user_id ?? 'conta'}`,
        cnpj: null,
        account_identifier: String(user_id ?? ''),
        is_active: true,
        auth_data: { access_token, refresh_token, user_id, expires_at },
        updated_at: new Date().toISOString(),
      } as any;

      // Procurar existente e decidir entre UPDATE/INSERT (evita depender de índice único)
      const { data: existing, error: selErr } = await supabase
        .from('integration_accounts')
        .select('id')
        .eq('organization_id', orgId)
        .eq('provider', 'mercadolivre')
        .eq('account_identifier', String(user_id ?? ''))
        .maybeSingle();
      if (selErr) throw selErr;

      let saveErr: any = null;
      if (existing?.id) {
        const { error } = await supabase
          .from('integration_accounts')
          .update(base)
          .eq('id', existing.id);
        saveErr = error;
      } else {
        const { error } = await supabase
          .from('integration_accounts')
          .insert(base);
        saveErr = error;
      }
      if (saveErr) throw saveErr;
    } catch (e: any) {
      console.error('Salvar conta ML falhou:', e);
      return json({ error: 'Falha ao salvar conta ML', details: e?.message || e?.hint || e }, 500);
    }

    // Redireciona/fecha popup e notifica a aba original
    const appOrigin = parsed?.o || '';
    if (appOrigin) {
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>Mercado Livre conectado</title><meta http-equiv="refresh" content="2; url=${appOrigin + '/mercado-livre?connected=1'}"></head><body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding:24px;">
          <h3>Conexão realizada</h3>
          <p>Você já pode fechar esta janela.</p>
          <p><a href=${JSON.stringify(appOrigin + '/mercado-livre?connected=1')}>Se não redirecionar automaticamente, clique aqui</a></p>
          <script>
            const targetOrigin = ${JSON.stringify(appOrigin)};
            const redirectUrl = ${JSON.stringify(appOrigin + '/mercado-livre?connected=1')};
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({ source: 'mercadolivre-oauth', connected: true }, targetOrigin);
              }
            } catch (e) {}
            try { window.close(); } catch (e) {}
            setTimeout(() => { location.replace(redirectUrl); }, 300);
          </script>
        </body></html>`;
        return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS } });
    }
    const target = `${new URL(req.url).origin.replace('.functions', '')}/mercado-livre?connected=1`;
    return new Response(null, {
      status: 302,
      headers: {
        Location: target,
        ...CORS,
      },
    });
  }

  return json({ ok: true, hint: 'Use ?action=auth-url ou GET /callback' });
});

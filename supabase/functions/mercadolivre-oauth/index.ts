// Supabase Edge Function: Mercado Livre OAuth helper (state sem JWT)
// - GET ?action=auth-url -> retorna URL de autorização com state=nonce (PKCE + state salvo em tabela)
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

function b64url(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const path = url.pathname;
  const action = url.searchParams.get('action');

  if (!ML_APP_ID || !ML_APP_SECRET) {
    return json({ error: 'Configure ML_APP_ID e ML_APP_SECRET nos Secrets das Edge Functions.' }, 500);
  }

  if (action === 'auth-url') {
    // Exige usuário autenticado (JWT no header)
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Não autenticado' }, 401);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Usuário não autenticado' }, 401);

    // Descobrir organização atual
    const { data: orgId, error: orgErr } = await userClient.rpc('get_current_org_id');
    if (orgErr || !orgId) return json({ error: 'Organização não encontrada' }, 400);

    // PKCE
    const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
    const code_verifier = b64url(verifierBytes);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code_verifier));
    const code_challenge = b64url(new Uint8Array(digest));

    // Nonce (armazenado no DB)
    const nonce = crypto.randomUUID();

    // Salvar state no banco com service role (RLS bypass)
    const svc = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { error: insErr } = await svc.from('oauth_states').insert({ id: nonce, user_id: user.id, code_verifier });
    if (insErr) {
      console.error('Falha ao salvar oauth_state:', insErr);
      return json({ error: 'Falha interna ao iniciar OAuth' }, 500);
    }

    const appOrigin = req.headers.get('x-app-origin') || req.headers.get('referer') || '';
    const redirectUri = `${SUPABASE_URL}/functions/v1/mercadolivre-oauth/callback`;
    const authorizeUrl = new URL('https://auth.mercadolivre.com.br/authorization');
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('client_id', ML_APP_ID);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('state', JSON.stringify({ n: nonce, o: appOrigin }));
    authorizeUrl.searchParams.set('code_challenge', code_challenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');

    return json({ url: authorizeUrl.toString(), redirect_uri: redirectUri });
  }

  if (path.endsWith('/callback')) {
    const code = url.searchParams.get('code');
    const stateRaw = url.searchParams.get('state') || '';

    let parsed: any = {};
    try { parsed = JSON.parse(stateRaw); } catch { parsed = {}; }
    const nonce = parsed?.n as string | undefined;
    const appOrigin = parsed?.o as string | '';

    if (!code || !nonce) return json({ error: 'Parâmetros ausentes' }, 400);

    // Recuperar code_verifier e user_id
    const svc = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: st, error: stErr } = await svc
      .from('oauth_states')
      .select('user_id, code_verifier')
      .eq('id', nonce)
      .maybeSingle();
    if (stErr || !st) return json({ error: 'State inválido ou expirado' }, 400);

    const redirectUri = `${SUPABASE_URL}/functions/v1/mercadolivre-oauth/callback`;
    const form = new URLSearchParams();
    form.set('grant_type', 'authorization_code');
    form.set('client_id', ML_APP_ID);
    form.set('client_secret', ML_APP_SECRET);
    form.set('code', code);
    form.set('redirect_uri', redirectUri);
    form.set('code_verifier', st.code_verifier);

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

    try {
      // Org do usuário do state
      const { data: prof } = await svc.from('profiles').select('organizacao_id').eq('id', st.user_id).maybeSingle();
      if (!prof?.organizacao_id) throw new Error('Organização não encontrada para o usuário');
      const orgId = prof.organizacao_id as string;

      const baseAccount: any = {
        organization_id: orgId,
        provider: 'mercadolivre',
        name: `ML ${user_id ?? 'conta'}`,
        cnpj: null,
        account_identifier: String(user_id ?? ''),
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      // UPSERT account and retrieve id
      let accountId: string | null = null;
      const { data: existing } = await svc
        .from('integration_accounts')
        .select('id')
        .eq('organization_id', orgId)
        .eq('provider', 'mercadolivre')
        .eq('account_identifier', String(user_id ?? ''))
        .maybeSingle();

      if (existing?.id) {
        const { error } = await svc.from('integration_accounts').update(baseAccount).eq('id', existing.id);
        if (error) throw error;
        accountId = existing.id;
      } else {
        const { data: ins, error } = await svc.from('integration_accounts').insert(baseAccount).select('id').single();
        if (error) throw error;
        accountId = ins.id as string;
      }

      // Upsert secrets securely using new secure function
      if (accountId) {
        const { data: existingSecret } = await svc.rpc('get_integration_secret_secure', {
          account_id: accountId,
          provider_name: 'mercadolivre',
          requesting_function: 'mercadolivre-oauth'
        });

        if (existingSecret && existingSecret.length > 0) {
          // Update existing secret
          const { data: updateResult } = await svc.rpc('update_integration_secret_secure', {
            account_id: accountId,
            provider_name: 'mercadolivre',
            new_access_token: access_token,
            new_refresh_token: refresh_token ?? null,
            new_client_id: ML_APP_ID,
            new_expires_at: expires_at,
            new_payload: { user_id }
          });
          if (!updateResult) throw new Error('Failed to update integration secret');
        } else {
          // Create new secret
          const { data: createResult } = await svc.rpc('create_integration_secret_secure', {
            account_id: accountId,
            provider_name: 'mercadolivre',
            org_id: orgId,
            access_token: access_token,
            refresh_token: refresh_token ?? null,
            client_id: ML_APP_ID,
            expires_at: expires_at,
            payload: { user_id }
          });
          if (!createResult) throw new Error('Failed to create integration secret');
        }
      }

      // Limpar state usado
      await svc.from('oauth_states').delete().eq('id', nonce);
    } catch (e: any) {
      console.error('Salvar conta ML falhou:', e);
      return json({ error: 'Falha ao salvar conta ML', details: e?.message || e }, 500);
    }

    // Resposta HTML para fechar/redirect
    if (appOrigin) {
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Mercado Livre conectado</title><meta http-equiv="refresh" content="2; url=${appOrigin + '/mercado-livre?connected=1'}"></head><body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding:24px;">
        <h3>Conexão realizada</h3>
        <p>Você já pode fechar esta janela.</p>
        <p><a href=${JSON.stringify(appOrigin + '/mercado-livre?connected=1')}>Se não redirecionar automaticamente, clique aqui</a></p>
        <script>
          const targetOrigin = ${JSON.stringify(appOrigin)};
          const redirectUrl = ${JSON.stringify(appOrigin + '/mercado-livre?connected=1')};
          try { if (window.opener && !window.opener.closed) { window.opener.postMessage({ source: 'mercadolivre-oauth', connected: true }, targetOrigin); } } catch (e) {}
          try { window.close(); } catch (e) {}
          setTimeout(() => { location.replace(redirectUrl); }, 300);
        </script>
      </body></html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store, max-age=0, must-revalidate', 'Pragma': 'no-cache', ...CORS } });
    }

    const target = `${new URL(req.url).origin.replace('.functions', '')}/mercado-livre?connected=1`;
    return new Response(null, { status: 302, headers: { Location: target, 'Cache-Control': 'no-store, max-age=0, must-revalidate', 'Pragma': 'no-cache', ...CORS } });
  }

  return json({ ok: true, hint: 'Use ?action=auth-url ou GET /callback' });
});

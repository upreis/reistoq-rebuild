// Supabase Edge Function: tiny-v3-oauth-callback
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const OIDC_TOKEN_URL = "https://accounts.tiny.com.br/realms/tiny/protocol/openid-connect/token";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-code, x-state",
  "Access-Control-Expose-Headers": "x-request-id",
};

function json(body: unknown, status = 200, requestId?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...corsHeaders };
  if (requestId) headers["x-request-id"] = requestId;
  return new Response(JSON.stringify(body), { status, headers });
}

function fromB64(s: string) {
  try { 
    return JSON.parse(atob(s)); 
  } catch (e) { 
    console.log("fromB64 error:", e, "input:", s);
    return null; 
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const requestId = crypto.randomUUID();

  try {
    console.log("tinyv3.oauth.callback.start", { requestId, method: req.method, url: req.url });

    // Extract code and state from custom headers (sent by React app)
    const code = req.headers.get("x-code");
    const state = req.headers.get("x-state");

    console.log("tinyv3.oauth.callback.params", { requestId, hasCode: !!code, hasState: !!state });

    if (!code || !state) return json({ error: "missing_params", requestId }, 400, requestId);
    
    const stateObj = fromB64(state);
    const orgId: string | undefined = stateObj?.orgId;
    console.log("tinyv3.oauth.callback.state_decoded", { requestId, orgId, stateObj });
    
    if (!orgId) return json({ error: "invalid_state", requestId }, 400, requestId);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    console.log("tinyv3.oauth.callback.debug", { requestId, orgId, code: code?.substring(0, 10) + "...", state: state?.substring(0, 10) + "..." });
    
    const { data: credsRows } = await admin
      .from("tiny_v3_credentials")
      .select("client_id, client_secret, redirect_uri")
      .eq("organization_id", orgId)
      .limit(1);

    const client_id = credsRows?.[0]?.client_id || Deno.env.get("TINY_V3_CLIENT_ID");
    const client_secret = credsRows?.[0]?.client_secret || Deno.env.get("TINY_V3_CLIENT_SECRET");
    const redirect_uri = credsRows?.[0]?.redirect_uri || Deno.env.get("TINY_V3_REDIRECT_URI");

    console.log("tinyv3.oauth.callback.config", { 
      requestId, 
      hasClientId: !!client_id, 
      hasClientSecret: !!client_secret,
      hasRedirectUri: !!redirect_uri,
      credsRowsLength: credsRows?.length || 0
    });

    if (!client_id || !client_secret || !redirect_uri) {
      return json({ error: "missing_client_config", details: "Defina client_id/client_secret/redirect_uri ou secrets TINY_V3_*", requestId }, 400, requestId);
    }

    // Create Basic Auth header like in the Flask example: base64(client_id:client_secret)
    const basicAuth = btoa(`${client_id}:${client_secret}`);
    
    const form = new URLSearchParams();
    form.set("grant_type", "authorization_code");
    form.set("code", code);
    form.set("redirect_uri", redirect_uri);

    const resp = await fetch(OIDC_TOKEN_URL, {
      method: "POST",
      headers: { 
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded" 
      },
      body: form.toString(),
    });

    const payload = await resp.json().catch(() => ({}));
    console.log("tinyv3.oauth.callback.token_response", { requestId, status: resp.status, hasAccessToken: !!payload.access_token });
    
    if (!resp.ok) {
      console.log("tinyv3.oauth.callback.error", { requestId, status: resp.status, payload });
      return json({ error: "token_exchange_failed", status: resp.status, payload, requestId }, 400, requestId);
    }

    const access_token: string = payload.access_token;
    const refresh_token: string = payload.refresh_token;
    const expires_in: number = payload.expires_in || 3600;
    const token_type: string = payload.token_type || "Bearer";
    const scope: string = payload.scope || "";

    const expires_at = new Date(Date.now() + (expires_in * 1000)).toISOString();

    console.log("tinyv3.oauth.callback.before_upsert", { requestId, orgId, hasTokens: !!access_token && !!refresh_token });

    // Upsert tokens for org
    const { data: upsertData, error: upsertError } = await admin.from("tiny_v3_tokens").upsert({
      organization_id: orgId,
      access_token,
      refresh_token,
      expires_at,
      token_type,
      scope,
    }, { onConflict: "organization_id" });

    console.log("tinyv3.oauth.callback.upsert_result", { requestId, orgId, upsertError, upsertData });

    if (upsertError) {
      console.log("tinyv3.oauth.callback.upsert_error", { requestId, error: upsertError });
      return json({ error: "token_save_failed", details: upsertError, requestId }, 500, requestId);
    }

    console.log("tinyv3.oauth.callback.saved", { requestId, orgId });

    // Return success response for client-side redirect
    return json({ success: true, requestId, orgId, expires_at }, 200, requestId);
  } catch (e) {
    console.log("tinyv3.oauth.callback.fatal_error", { requestId, error: String(e), stack: e.stack });
    return json({ error: String(e), requestId }, 500, requestId);
  }
});

// Supabase Edge Function: tiny-v3-oauth-start
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const OIDC_AUTH_URL = "https://accounts.tiny.com.br/realms/tiny/protocol/openid-connect/auth";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "x-request-id",
};

function json(body: unknown, status = 200, requestId?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...corsHeaders };
  if (requestId) headers["x-request-id"] = requestId;
  return new Response(JSON.stringify(body), { status, headers });
}

function b64(s: string) {
  return btoa(unescape(encodeURIComponent(s)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const requestId = crypto.randomUUID();

  try {
    // Client with user JWT to get org id
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });

    const { data: org, error: orgErr } = await userClient.rpc("get_current_org_id");
    if (orgErr) return json({ error: "org_error", details: orgErr.message, requestId }, 400, requestId);
    const orgId: string | null = org as any;
    if (!orgId) return json({ error: "org_not_found", requestId }, 400, requestId);

    // Service role to read credentials (bypass RLS for safety)
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: credsRows } = await admin
      .from("tiny_v3_credentials")
      .select("client_id, client_secret, redirect_uri")
      .eq("organization_id", orgId)
      .limit(1);

    const client_id = credsRows?.[0]?.client_id || Deno.env.get("TINY_V3_CLIENT_ID");
    const redirect_uri = credsRows?.[0]?.redirect_uri || Deno.env.get("TINY_V3_REDIRECT_URI");

    if (!client_id || !redirect_uri) {
      return json({ error: "missing_client_config", details: "Configure client_id/redirect_uri ou defina secrets TINY_V3_CLIENT_ID/TINY_V3_REDIRECT_URI.", requestId }, 400, requestId);
    }

    // Build state and auth URL
    const statePayload = { orgId, nonce: crypto.randomUUID() };
    const state = b64(JSON.stringify(statePayload));

    const url = new URL(OIDC_AUTH_URL);
    url.searchParams.set("client_id", client_id);
    url.searchParams.set("redirect_uri", redirect_uri);
    url.searchParams.set("scope", "openid offline_access");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);

    console.log("tinyv3.oauth.start", { requestId, orgId });
    return json({ authUrl: url.toString(), requestId }, 200, requestId);
  } catch (e) {
    return json({ error: String(e), requestId }, 500, requestId);
  }
});

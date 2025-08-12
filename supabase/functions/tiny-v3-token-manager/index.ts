// Supabase Edge Function: tiny-v3-token-manager
// Returns a valid bearer token for Tiny v3 for the current organization; refreshes if <5min.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const OIDC_TOKEN_URL = "https://accounts.tiny.com.br/realms/tiny/protocol/openid-connect/token";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const requestId = crypto.randomUUID();

  try {
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: orgId, error: orgErr } = await userClient.rpc("get_current_org_id");
    if (orgErr || !orgId) return json({ error: "org_not_found", requestId }, 400, requestId);

    // Fetch tokens for org
    const { data: tokenRow } = await admin
      .from("tiny_v3_tokens")
      .select("id, access_token, refresh_token, expires_at")
      .eq("organization_id", orgId as any)
      .single();

    if (!tokenRow) {
      // fallback: static secret (not recommended, but allowed)
      const bearer = Deno.env.get("TINY_V3_TOKEN");
      if (!bearer) return json({ error: "no_token", action: "connect", requestId }, 401, requestId);
      return json({ bearer, expiresAt: null, requestId }, 200, requestId);
    }

    const expiresAt = new Date(tokenRow.expires_at).getTime();
    const now = Date.now();
    const fiveMin = 5 * 60 * 1000;

    let access = tokenRow.access_token as string;
    let refreshed = false;

    if (expiresAt - now < fiveMin) {
      // need refresh
      const { data: credsRows } = await admin
        .from("tiny_v3_credentials")
        .select("client_id, client_secret, redirect_uri")
        .eq("organization_id", orgId as any)
        .limit(1);

      const client_id = credsRows?.[0]?.client_id || Deno.env.get("TINY_V3_CLIENT_ID");
      const client_secret = credsRows?.[0]?.client_secret || Deno.env.get("TINY_V3_CLIENT_SECRET");

      if (client_id && client_secret) {
        const form = new URLSearchParams();
        form.set("grant_type", "refresh_token");
        form.set("client_id", client_id);
        form.set("client_secret", client_secret);
        form.set("refresh_token", tokenRow.refresh_token);

        let resp = await fetch(OIDC_TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString() });
        if (!resp.ok) {
          // one retry
          resp = await fetch(OIDC_TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString() });
        }
        if (resp.ok) {
          const p = await resp.json().catch(() => ({}));
          access = p.access_token || access;
          const newRefresh = p.refresh_token || tokenRow.refresh_token;
          const expires_in: number = p.expires_in || 3600;
          const newExpiresAt = new Date(Date.now() + (expires_in * 1000)).toISOString();

          await admin.from("tiny_v3_tokens").update({ access_token: access, refresh_token: newRefresh, expires_at: newExpiresAt }).eq("id", tokenRow.id);
          refreshed = true;
        }
      }
    }

    return json({ bearer: access, expiresAt: tokenRow.expires_at, refreshed, requestId }, 200, requestId);
  } catch (e) {
    return json({ error: String(e), requestId }, 500, requestId);
  }
});

// Supabase Edge Function: tiny-v3-disconnect
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    // Client with user JWT to get org id
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });

    const { data: org, error: orgErr } = await userClient.rpc("get_current_org_id");
    if (orgErr) return json({ error: "org_error", details: orgErr.message, requestId }, 400, requestId);
    const orgId: string | null = org as any;
    if (!orgId) return json({ error: "org_not_found", requestId }, 400, requestId);

    // Service role to delete tokens for org
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await admin
      .from("tiny_v3_tokens")
      .delete()
      .eq("organization_id", orgId)
      .select("id");

    if (error) return json({ error: "delete_failed", details: error.message, requestId }, 400, requestId);

    console.log("tinyv3.disconnect", { requestId, orgId, deleted: (data?.length ?? 0) });
    return json({ success: true, deleted: data?.length ?? 0, requestId }, 200, requestId);
  } catch (e) {
    return json({ error: String(e), requestId }, 500, requestId);
  }
});

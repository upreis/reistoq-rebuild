// Supabase Edge Function: Proxy de pedidos Shopee
// JSON-only responses with x-request-id and CORS. Placeholder integration awaiting tokens.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Expose-Headers": "x-request-id",
};

function json(body: any, status = 200, requestId?: string) {
  const headers: Record<string,string> = { "Content-Type": "application/json", ...CORS };
  if (requestId) headers["x-request-id"] = requestId;
  return new Response(JSON.stringify(body), { status, headers });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const requestId = crypto.randomUUID();

  try {
    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('authorization') || '' } }
    });
    const { data: { user } } = await userSupabase.auth.getUser();
    if (!user) return json({ error: 'Não autenticado', requestId }, 401, requestId);

    // Params
    const params = new URL(req.url).searchParams;
    const limit = Math.max(1, Math.min(50, Number(params.get('limit') || '50')));
    const offset = Math.max(0, Number(params.get('offset') || '0'));
    const from = params.get('from');
    const to = params.get('to');

    // Fetch active Shopee integration for user's organization
    const { data: profile } = await userSupabase.from('profiles').select('organizacao_id').eq('id', user.id).single();
    if (!profile?.organizacao_id) return json({ error: 'Organização não encontrada', requestId }, 400, requestId);

    const { data: accs } = await userSupabase
      .from('integration_accounts')
      .select('*')
      .eq('organization_id', profile.organizacao_id)
      .eq('provider', 'shopee')
      .eq('is_active', true)
      .limit(1);

    if (!accs || accs.length === 0) {
      return json({ results: [], paging: { total: 0, limit, offset }, _debug: { reason: 'no_active_account' }, requestId }, 200, requestId);
    }

    const acc = accs[0];
    // Placeholder: real Shopee API requires partner/auth signatures; we return empty safely until tokens are configured.
    return json({ results: [], paging: { total: 0, limit, offset }, _debug: { account_id: acc.id, from, to } , requestId }, 200, requestId);
  } catch (e) {
    return json({ error: String(e), requestId }, 500, requestId);
  }
});

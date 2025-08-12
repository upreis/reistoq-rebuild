import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const nowIso = new Date().toISOString();
    console.log(`[cleanup-oauth-states] Iniciando limpeza em ${nowIso}`);

    // Deleta registros expirados e retorna ids para contagem
    const { data, error } = await supabase
      .from("oauth_states")
      .delete()
      .lt("expires_at", nowIso)
      .select("id");

    if (error) {
      console.error("Erro ao limpar oauth_states expirados:", error.message);
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const count = data?.length ?? 0;
    console.log(`[cleanup-oauth-states] Registros removidos: ${count}`);

    return new Response(
      JSON.stringify({ ok: true, removed: count, at: nowIso }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e: any) {
    console.error("Falha inesperada no cleanup-oauth-states:", e?.message || e);
    return new Response(
      JSON.stringify({ ok: false, error: e?.message || String(e) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

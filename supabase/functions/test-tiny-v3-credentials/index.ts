import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const client_id = Deno.env.get("TINY_V3_CLIENT_ID");
    const client_secret = Deno.env.get("TINY_V3_CLIENT_SECRET");
    const redirect_uri = Deno.env.get("TINY_V3_REDIRECT_URI");

    return json({
      success: true,
      credentials: {
        hasClientId: !!client_id,
        hasClientSecret: !!client_secret,
        hasRedirectUri: !!redirect_uri,
        clientIdLength: client_id?.length || 0,
        clientSecretLength: client_secret?.length || 0,
        redirectUri: redirect_uri,
      }
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
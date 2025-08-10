// Supabase Edge Function: Webhook de notificações do Mercado Livre (stub)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return new Response('OK', { headers: CORS });
  try {
    const body = await req.json().catch(() => null);
    console.log('ML webhook:', body);
  } catch {}
  return new Response('OK', { headers: CORS });
});

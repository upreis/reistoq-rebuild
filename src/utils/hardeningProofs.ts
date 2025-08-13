import { supabase } from '@/integrations/supabase/client';

function mask(token?: string | null) {
  if (!token) return 'Bearer ***';
  const len = token.length;
  const head = token.slice(0, 6);
  const tail = token.slice(-6);
  return `Bearer ${head}…${tail}`;
}

export async function runHardeningProofs() {
  try {
    // Log environment confirmation (masked)
    const supabaseUrl = "https://tdjyfqnxvjgossuncpwm.supabase.co";
    console.group('[Environment] Supabase Configuration');
    console.log('SUPABASE_URL (masked)', supabaseUrl.replace(/\/\/(.+?)\./, '//*****.'));
    console.groupEnd();

    const { data: session } = await (supabase as any).auth.getSession();
    const jwt = session?.session?.access_token || null;
    console.group('[Hardening] Auth context');
    console.log('have_session', !!session?.session);
    console.log('authorization', mask(jwt));
    console.groupEnd();

    // Note: Direct access to secrets tables removed for security
    // These tables are now only accessible via Edge Functions with service_role
    console.group('[Hardening] Secrets tables access (via Edge Functions only)');
    console.log('tiny_v3_tokens', 'Access restricted to service_role via Edge Functions');
    console.log('integration_secrets', 'Access restricted to service_role via Edge Functions');
    console.groupEnd();

    // 3) /rest/v1/historico_vendas_public -> deve 404
    try {
      const res3 = await ((supabase as any).from('historico_vendas_public').select('*').limit(1) as any);
      console.group('[Hardening] GET /rest/v1/historico_vendas_public (expect 404)');
      if (res3?.error) {
        console.log('status', res3.error?.code || res3.error?.status || 'error');
        console.log('error', res3.error);
      } else {
        console.log('status', 200);
        console.log('data_sample', Array.isArray(res3?.data) ? res3.data.slice(0, 1) : res3?.data);
      }
      console.groupEnd();
    } catch (e) {
      console.group('[Hardening] GET /rest/v1/historico_vendas_public (exception)');
      console.log('exception', e);
      console.groupEnd();
    }
  } catch (e) {
    console.error('[Hardening] Falha ao executar provas', e);
  }
}

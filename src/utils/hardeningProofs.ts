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
    const { data: session } = await (supabase as any).auth.getSession();
    const jwt = session?.session?.access_token || null;
    console.group('[Hardening] Auth context');
    console.log('have_session', !!session?.session);
    console.log('authorization', mask(jwt));
    console.groupEnd();

    // 1) /rest/v1/tiny_v3_tokens -> deve 42501
    try {
      const res1 = await ((supabase as any).from('tiny_v3_tokens').select('*').limit(1) as any);
      console.group('[Hardening] GET /rest/v1/tiny_v3_tokens?select=* (expect 42501)');
      if (res1?.error) {
        console.log('status', res1.error?.code || res1.error?.status || 'error');
        console.log('error', res1.error);
      } else {
        console.log('status', 200);
        console.log('data_sample', Array.isArray(res1?.data) ? res1.data.slice(0, 1) : res1?.data);
      }
      console.groupEnd();
    } catch (e) {
      console.group('[Hardening] GET /rest/v1/tiny_v3_tokens?select=* (exception)');
      console.log('exception', e);
      console.groupEnd();
    }

    // 2) /rest/v1/integration_secrets -> deve 42501
    try {
      const res2 = await ((supabase as any).from('integration_secrets').select('*').limit(1) as any);
      console.group('[Hardening] GET /rest/v1/integration_secrets?select=* (expect 42501)');
      if (res2?.error) {
        console.log('status', res2.error?.code || res2.error?.status || 'error');
        console.log('error', res2.error);
      } else {
        console.log('status', 200);
        console.log('data_sample', Array.isArray(res2?.data) ? res2.data.slice(0, 1) : res2?.data);
      }
      console.groupEnd();
    } catch (e) {
      console.group('[Hardening] GET /rest/v1/integration_secrets?select=* (exception)');
      console.log('exception', e);
      console.groupEnd();
    }

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

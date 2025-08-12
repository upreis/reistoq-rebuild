import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      // aguardar session e redirecionar
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (session?.user) {
        // verificar organização
        const { data: profile } = await supabase
          .from('profiles')
          .select('organizacao_id')
          .eq('id', session.user.id)
          .single();
        navigate(profile?.organizacao_id ? '/dashboard' : '/onboarding', { replace: true });
      } else {
        // se não logou ainda, ir para /auth
        navigate('/auth', { replace: true });
      }
    };
    run();
    return () => { mounted = false };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Confirmando sua conta...</p>
      </div>
    </div>
  );
}

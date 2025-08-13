import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  organizacao: any | null;
  onboardingCompleto: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (data: any) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [organizacao, setOrganizacao] = useState<any | null>(null);
  const [onboardingCompleto, setOnboardingCompleto] = useState(false);
  const { toast } = useToast();

  // Carregar dados da organização e verificar onboarding
  const carregarDadosUsuario = async (userId: string) => {
    try {
      // Usar RPC seguro para buscar profile com organização
      const { data: profiles } = await supabase.rpc('admin_list_profiles', {
        _search: null,
        _limit: 1,
        _offset: 0
      });

      const profile = profiles?.[0];
      
      if (profile?.organizacao_id) {
        // Buscar dados da organização separadamente
        const { data: org } = await supabase
          .from('organizacoes')
          .select('*')
          .eq('id', profile.organizacao_id)
          .single();
        
        if (org) {
          setOrganizacao(org);
        }
      }

      // Verificar se onboarding foi completo
      const { data: config } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'onboarding_completo')
        .single();

      setOnboardingCompleto(config?.valor === 'true');
    } catch (error) {
      // Se não tiver dados, onboarding não foi completo
      setOnboardingCompleto(false);
    }
  };

  useEffect(() => {
    // Configurar listener de mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer o carregamento de dados para evitar deadlock
          setTimeout(() => {
            carregarDadosUsuario(session.user.id);
          }, 0);
        } else {
          setOrganizacao(null);
          setOnboardingCompleto(false);
        }
        
        setLoading(false);
      }
    );

    // Verificar sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          carregarDadosUsuario(session.user.id);
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Erro no login",
          description: error.message,
          variant: "destructive"
        });
      }

      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData?: any) => {
    try {
      setLoading(true);
      const redirectUrl = `${window.location.origin}/auth/callback`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nome_completo: userData?.nome_completo || '',
            nome_exibicao: userData?.nome_exibicao || '',
          }
        }
      });

      if (error) {
        toast({
          title: "Erro no cadastro",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Cadastro realizado!",
          description: "Verifique seu email para confirmar a conta.",
        });
      }

      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast({
          title: "Erro ao sair",
          description: error.message,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: any) => {
    try {
      if (!user) return { error: new Error('Usuário não autenticado') };

      // Note: Profile updates now need to be handled via admin functions
      // For self-updates, we'll need to create a separate RPC function
      const error = new Error('Profile updates via RPC not yet implemented');

      if (error) {
        toast({
          title: "Erro ao atualizar perfil",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Perfil atualizado",
          description: "Suas informações foram salvas com sucesso.",
        });
        
        // Recarregar dados do usuário
        setTimeout(() => {
          carregarDadosUsuario(user.id);
        }, 0);
      }

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    organizacao,
    onboardingCompleto,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
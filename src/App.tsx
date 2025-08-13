import { Suspense, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/hooks/use-theme';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import Auth from '@/pages/Auth';
import { OnboardingPage } from '@/pages/Onboarding';
import { Index } from '@/pages/Index';
import NotFound from '@/pages/NotFound';
import { Dashboard } from '@/components/pages/Dashboard';
import { Estoque } from '@/components/pages/Estoque';
import { Pedidos } from '@/components/pages/Pedidos';
import DePara from '@/components/pages/DePara';
import { Historico } from '@/components/pages/Historico';
import { Scanner } from '@/components/pages/Scanner';
import { Configuracoes } from '@/components/pages/Configuracoes';
import { Loader2 } from 'lucide-react';
import { PermissionGate } from '@/components/auth/PermissionGate';
import MercadoLivre from '@/components/pages/MercadoLivre';
import TinyV3Callback from '@/pages/TinyV3Callback';
import AuthCallback from '@/pages/AuthCallback';
import { runHardeningProofs } from '@/utils/hardeningProofs';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold mb-4">Oops! Algo deu errado</h2>
        <p className="text-muted-foreground mb-4">
          Ocorreu um erro inesperado. Tente recarregar a página.
        </p>
        <button 
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Tentar novamente
        </button>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer">Detalhes do erro</summary>
            <pre className="mt-2 text-sm text-red-600 overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

const App = () => {
  useEffect(() => {
    // Executa as provas de hardening ao carregar o app
    runHardeningProofs();
  }, []);
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
          <AuthProvider>
            <Router>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  {/* Rotas públicas */}
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  
                  {/* Onboarding (protegido mas sem exigir onboarding completo) */}
                  <Route 
                    path="/onboarding" 
                    element={
                      <ProtectedRoute requireOnboarding={false}>
                        <OnboardingPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Rotas protegidas com layout */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <PermissionGate required="dashboard:view">
                          <Dashboard />
                        </PermissionGate>
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/estoque" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <PermissionGate required="estoque:view">
                          <Estoque />
                        </PermissionGate>
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/pedidos" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <PermissionGate required="pedidos:view">
                          <Pedidos />
                        </PermissionGate>
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/depara" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <PermissionGate required="depara:view">
                          <DePara />
                        </PermissionGate>
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/historico" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <PermissionGate required="historico:view">
                          <Historico />
                        </PermissionGate>
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/scanner" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <PermissionGate required="scanner:use">
                          <Scanner />
                        </PermissionGate>
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/configuracoes" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <PermissionGate required="configuracoes:view">
                          <Configuracoes />
                        </PermissionGate>
                      </MainLayout>
                    </ProtectedRoute>
                  } />

                  <Route path="/mercado-livre" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <PermissionGate required="pedidos:view">
                          <MercadoLivre />
                        </PermissionGate>
                      </MainLayout>
                    </ProtectedRoute>
                  } />

                  {/* OAuth callback for Tiny v3 */}
                  <Route path="/integrations/tiny/callback" element={<ProtectedRoute><TinyV3Callback /></ProtectedRoute>} />
                  
                  {/* Catch all - 404 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </Router>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ReistoqLogo } from '@/components/ui/reistoq-logo';
import { Package, BarChart3, ShoppingCart, Smartphone } from 'lucide-react';

export function Index() {
  const { user, loading } = useAuth();

  // Redirecionar usuários autenticados
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const features = [
    {
      icon: Package,
      title: "Gestão de Estoque",
      description: "Controle completo do seu inventário com alertas inteligentes"
    },
    {
      icon: BarChart3,
      title: "Relatórios Avançados",
      description: "Análises detalhadas para tomada de decisão estratégica"
    },
    {
      icon: ShoppingCart,
      title: "Integração E-commerce",
      description: "Sincronização automática com Tiny ERP e marketplaces"
    },
    {
      icon: Smartphone,
      title: "Scanner Mobile",
      description: "Leia códigos de barras direto do celular"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ReistoqLogo className="h-12 w-auto mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <ReistoqLogo className="h-8 w-auto" />
          <div className="space-x-4">
            <Button variant="ghost" asChild>
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild>
              <Link to="/auth">Começar Grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6 gradient-primary bg-clip-text text-transparent">
            Gerencie seu estoque com inteligência
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Sistema completo de gestão de estoque com integração nativa ao Tiny ERP, 
            scanner de código de barras e relatórios avançados.
          </p>
          <div className="space-x-4">
            <Button size="lg" asChild>
              <Link to="/auth">Começar Gratuitamente</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#features">Ver Funcionalidades</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-background/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Tudo que você precisa para gerenciar seu estoque
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Funcionalidades desenvolvidas especialmente para pequenas e médias empresas
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Pronto para revolucionar sua gestão?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Junte-se a centenas de empresas que já confiam no REISTOQ
          </p>
          <Button size="lg" asChild>
            <Link to="/auth">Criar Conta Grátis</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 REISTOQ. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReistoqLogo } from '@/components/ui/reistoq-logo';
import { Package, BarChart3, ShoppingCart, Smartphone, Zap, Shield, Clock, TrendingUp, CheckCircle, ArrowRight, Play, Users, Star } from 'lucide-react';
import { useEffect } from 'react';

export function Index() {
  const { user, loading } = useAuth();

  // Forçar modo dark para a landing page
  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => {
      // Restaurar tema do usuário ao sair da página
      const savedTheme = localStorage.getItem('reistoq-ui-theme');
      if (savedTheme !== 'dark') {
        document.documentElement.classList.remove('dark');
        if (savedTheme === 'light') {
          document.documentElement.classList.add('light');
        }
      }
    };
  }, []);

  // Redirecionar usuários autenticados
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const features = [
    {
      icon: Package,
      title: "Gestão de Estoque Inteligente",
      description: "Controle completo com alertas automáticos, níveis mínimos e máximos configuráveis",
      metrics: "99% precisão"
    },
    {
      icon: BarChart3,
      title: "Analytics Avançado",
      description: "Dashboards em tempo real, previsões de demanda e relatórios personalizados",
      metrics: "15+ relatórios"
    },
    {
      icon: ShoppingCart,
      title: "Integração Total",
      description: "Sincronização automática com Tiny ERP, marketplaces e e-commerce",
      metrics: "API nativa"
    },
    {
      icon: Smartphone,
      title: "Scanner Móvel",
      description: "Leitura de códigos de barras via câmera, movimentações instantâneas",
      metrics: "Sem hardware"
    }
  ];

  const benefits = [
    {
      icon: Zap,
      title: "Economia de Tempo",
      description: "Reduza em 80% o tempo gasto com controle manual de estoque",
      highlight: "80% menos tempo"
    },
    {
      icon: Shield,
      title: "Segurança de Dados",
      description: "Backup automático, criptografia e compliance com LGPD",
      highlight: "100% seguro"
    },
    {
      icon: TrendingUp,
      title: "Aumento de Lucro",
      description: "Evite rupturas e excessos, otimize seu capital de giro",
      highlight: "25% mais lucro"
    }
  ];

  const testimonials = [
    {
      name: "Maria Silva",
      company: "Loja Virtual Plus",
      text: "Desde que implementamos o REISTOQ, nunca mais tivemos problemas de ruptura de estoque. O sistema é incrível!",
      rating: 5
    },
    {
      name: "João Santos",
      company: "Distribuidora ABC",
      text: "A integração com o Tiny foi perfeita. Economizamos 5 horas por dia só na gestão de estoque.",
      rating: 5
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark">
        <div className="text-center">
          <ReistoqLogo className="h-12 w-auto mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <ReistoqLogo className="h-8 w-auto" />
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth" className="text-muted-foreground hover:text-foreground">
                Entrar
              </Link>
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90" asChild>
              <Link to="/auth">Começar Grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5"></div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary border-primary/20">
              🚀 Usado por 1000+ empresas
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="gradient-primary bg-clip-text text-transparent">
                Revolucione
              </span>{" "}
              <br className="hidden sm:block" />
              sua gestão de estoque
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Sistema completo que automatiza seu controle de estoque, integra com seu ERP 
              e aumenta sua lucratividade em até <strong className="text-primary">25%</strong>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25" asChild>
                <Link to="/auth" className="flex items-center gap-2">
                  Começar Gratuitamente <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-border hover:bg-accent" asChild>
                <a href="#demo" className="flex items-center gap-2">
                  <Play className="h-4 w-4" /> Ver Demonstração
                </a>
              </Button>
            </div>
            
            {/* Social Proof */}
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                1000+ empresas
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                4.9 de avaliação
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                LGPD Compliant
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-accent/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Funcionalidades</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Tudo que você precisa em <span className="text-primary">uma só plataforma</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Desenvolvido especialmente para pequenas e médias empresas que querem crescer
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-border bg-card hover:shadow-lg transition-all duration-300 hover:scale-105">
                <CardContent className="p-6 text-center">
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground mb-3">{feature.description}</p>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {feature.metrics}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Resultados</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Resultados <span className="text-primary">comprovados</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center group">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <benefit.icon className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{benefit.title}</h3>
                <p className="text-muted-foreground mb-4">{benefit.description}</p>
                <div className="text-2xl font-bold text-primary">{benefit.highlight}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-20 bg-accent/5">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="outline" className="mb-4">Demonstração</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              Veja o <span className="text-primary">REISTOQ</span> em ação
            </h2>
            <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
              <div className="aspect-video bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Play className="h-16 w-16 text-primary mx-auto mb-4" />
                  <p className="text-lg font-semibold">Demonstração Interativa</p>
                  <p className="text-muted-foreground">Veja como é fácil gerenciar seu estoque</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Depoimentos</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              O que nossos <span className="text-primary">clientes dizem</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 italic">"{testimonial.text}"</p>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.company}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              Pronto para <span className="text-primary">revolucionar</span> sua gestão?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Junte-se a mais de 1000 empresas que já transformaram sua gestão de estoque
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25" asChild>
                <Link to="/auth" className="flex items-center gap-2">
                  Começar Gratuitamente <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <div className="text-sm text-muted-foreground">
                ✓ 30 dias grátis • ✓ Sem cartão de crédito • ✓ Suporte incluído
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-accent/5">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <ReistoqLogo className="h-10 w-auto mx-auto mb-6" />
            <p className="text-muted-foreground mb-4">
              Sistema de gestão de estoque inteligente para empresas que querem crescer
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <span>&copy; 2025 REISTOQ. Todos os direitos reservados.</span>
              <span>•</span>
              <a href="#" className="hover:text-foreground">Privacidade</a>
              <span>•</span>
              <a href="#" className="hover:text-foreground">Termos</a>
              <span>•</span>
              <a href="#" className="hover:text-foreground">Suporte</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
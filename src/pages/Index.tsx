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
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/10"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent"></div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-5xl mx-auto text-center">
            {/* Logo Hero */}
            <div className="mb-8 animate-float">
              <ReistoqLogo className="h-16 w-auto mx-auto mb-4" />
            </div>
            
            <Badge variant="secondary" className="mb-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
              🚀 Usado por 1000+ empresas brasileiras
            </Badge>
            <h1 className="text-4xl lg:text-7xl font-bold mb-8 leading-tight text-foreground">
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Revolucione
              </span>{" "}
              <br className="hidden sm:block" />
              sua gestão de estoque
            </h1>
            <p className="text-xl lg:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
              Sistema inteligente que <strong className="text-primary">automatiza 100%</strong> do seu controle de estoque, 
              integra com Tiny ERP e <strong className="text-accent">aumenta sua lucratividade em até 25%</strong>
            </p>
            
            {/* Stats Preview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-primary mb-1">99%</div>
                <div className="text-sm text-muted-foreground">Precisão</div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-accent mb-1">80%</div>
                <div className="text-sm text-muted-foreground">Menos Tempo</div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-success mb-1">25%</div>
                <div className="text-sm text-muted-foreground">Mais Lucro</div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-primary mb-1">1000+</div>
                <div className="text-sm text-muted-foreground">Empresas</div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
              <Button size="lg" className="bg-primary hover:bg-primary-hover shadow-elegant text-lg px-8 py-4 animate-glow" asChild>
                <Link to="/auth" className="flex items-center gap-2">
                  Começar Gratuitamente <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-primary/30 hover:bg-primary/10 text-lg px-8 py-4" asChild>
                <a href="#demo" className="flex items-center gap-2">
                  <Play className="h-5 w-5" /> Ver Demonstração
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
                   <h3 className="text-lg font-semibold mb-2 text-foreground">{feature.title}</h3>
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
                <h3 className="text-xl font-semibold mb-3 text-foreground">{benefit.title}</h3>
                <p className="text-muted-foreground mb-4">{benefit.description}</p>
                <div className="text-2xl font-bold text-primary">{benefit.highlight}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Demo Section */}
      <section id="demo" className="py-20 bg-gradient-to-br from-accent/5 to-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4 border-primary/30">Sistema em Ação</Badge>
              <h2 className="text-3xl lg:text-5xl font-bold mb-6">
                Veja o <span className="text-primary">REISTOQ</span> funcionando
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Interface real do sistema - sem simulação
              </p>
            </div>
            
            <div className="bg-card border border-border rounded-2xl p-2 shadow-elegant">
              <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl p-8">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 p-4 bg-card rounded-lg border border-border">
                      <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
                      <span className="text-sm">Sistema conectado ao Tiny ERP</span>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-card rounded-lg border border-border">
                      <Package className="h-5 w-5 text-primary" />
                      <span className="text-sm">1.247 produtos sincronizados</span>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-card rounded-lg border border-border">
                      <BarChart3 className="h-5 w-5 text-accent" />
                      <span className="text-sm">Relatórios em tempo real</span>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-card rounded-lg border border-border">
                      <Smartphone className="h-5 w-5 text-success" />
                      <span className="text-sm">Scanner móvel ativo</span>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="aspect-[4/3] bg-background border border-border rounded-xl p-6 shadow-lg">
                      <div className="text-center h-full flex flex-col justify-center">
                        <ReistoqLogo className="h-12 w-auto mx-auto mb-4 opacity-50" />
                        <Play className="h-20 w-20 text-primary mx-auto mb-4 cursor-pointer hover:scale-110 transition-transform" />
                        <p className="text-lg font-semibold text-foreground">Interface Real do Sistema</p>
                        <p className="text-muted-foreground text-sm">Clique para iniciar demonstração</p>
                      </div>
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-success rounded-full animate-pulse"></div>
                  </div>
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
                     <p className="font-semibold text-foreground">{testimonial.name}</p>
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

      {/* Pricing Preview Section */}
      <section className="py-20 bg-gradient-to-br from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-accent/30">Planos</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Escolha o plano <span className="text-primary">ideal</span> para seu negócio
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comece grátis e escale conforme sua empresa cresce
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="border-border hover:shadow-lg transition-all duration-300">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-bold mb-4 text-foreground">Starter</h3>
                <div className="text-3xl font-bold mb-6">Grátis</div>
                <ul className="space-y-3 text-sm text-muted-foreground mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Até 100 produtos
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Scanner básico
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Relatórios simples
                  </li>
                </ul>
                <Button className="w-full" variant="outline" asChild>
                  <Link to="/auth">Começar Grátis</Link>
                </Button>
              </CardContent>
            </Card>
            
            <Card className="border-primary shadow-lg scale-105 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">Mais Popular</Badge>
              </div>
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-bold mb-4">Professional</h3>
                <div className="text-3xl font-bold mb-6">
                  R$ 97<span className="text-sm text-muted-foreground">/mês</span>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Produtos ilimitados
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Integração Tiny ERP
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Analytics avançado
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Suporte prioritário
                  </li>
                </ul>
                <Button className="w-full bg-primary hover:bg-primary-hover" asChild>
                  <Link to="/auth">Iniciar Teste Grátis</Link>
                </Button>
              </CardContent>
            </Card>
            
            <Card className="border-border hover:shadow-lg transition-all duration-300">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-bold mb-4">Enterprise</h3>
                <div className="text-3xl font-bold mb-6">Customizado</div>
                <ul className="space-y-3 text-sm text-muted-foreground mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Múltiplas filiais
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    API personalizada
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Treinamento incluso
                  </li>
                </ul>
                <Button className="w-full" variant="outline">
                  <a href="mailto:contato@reistoq.com">Falar com Vendas</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-16 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <ReistoqLogo className="h-12 w-auto mb-6" />
              <p className="text-muted-foreground mb-6 max-w-md">
                Sistema de gestão de estoque inteligente para empresas que querem crescer de forma sustentável e eficiente.
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-success" />
                  LGPD Compliant
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  4.9/5 avaliação
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a></li>
                <li><a href="#demo" className="hover:text-foreground transition-colors">Demonstração</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Integrações</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Central de Ajuda</a></li>
                <li><a href="mailto:contato@reistoq.com" className="hover:text-foreground transition-colors">Contato</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">WhatsApp</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Treinamentos</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border pt-8 text-center">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
              <span>&copy; 2025 REISTOQ. Todos os direitos reservados.</span>
              <div className="flex items-center gap-6">
                <a href="#" className="hover:text-foreground transition-colors">Política de Privacidade</a>
                <a href="#" className="hover:text-foreground transition-colors">Termos de Uso</a>
                <a href="#" className="hover:text-foreground transition-colors">Cookies</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
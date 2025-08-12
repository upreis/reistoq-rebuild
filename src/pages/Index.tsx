import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReistoqLogo } from '@/components/ui/reistoq-logo';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Package, BarChart3, ShoppingCart, Smartphone, Zap, Shield, Clock, TrendingUp, CheckCircle, ArrowRight, Play, Users, Star } from 'lucide-react';
import { useEffect } from 'react';

export function Index() {
  const { user, loading } = useAuth();

  const SEO_TITLE = 'Reistoq — Gestão de Estoque simples e poderosa';
  const SEO_DESC = 'Automatize o estoque, integre com Tiny ERP e marketplaces e aumente a margem com analytics.';

  // Tema claro por padrão na landing + SEO
  useEffect(() => {
    const root = document.documentElement;
    const prevTheme = root.classList.contains('dark')
      ? 'dark'
      : (root.classList.contains('light') ? 'light' : null);

    // Força tema claro na landing
    root.classList.remove('dark');
    root.classList.add('light');

    // SEO: título, meta description e canonical
    document.title = SEO_TITLE;

    const ensureTag = (selector: string, create: () => HTMLElement) => {
      let el = document.querySelector(selector) as HTMLElement | null;
      if (!el) {
        el = create();
        document.head.appendChild(el);
      }
      return el;
    };

    const metaDesc = ensureTag('meta[name="description"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'description');
      return m;
    }) as HTMLMetaElement;
    metaDesc.setAttribute('content', SEO_DESC);

    const linkCanonical = ensureTag('link[rel="canonical"]', () => {
      const l = document.createElement('link');
      l.setAttribute('rel', 'canonical');
      return l;
    }) as HTMLLinkElement;
    linkCanonical.setAttribute('href', window.location.origin + '/');

    return () => {
      root.classList.remove('light');
      if (prevTheme) root.classList.add(prevTheme);
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
    <div className="min-h-screen bg-background">
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
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Coluna Esquerda */}
            <div>
              <Badge variant="secondary" className="mb-4">Usado por 1000+ empresas</Badge>
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
                <span className="bg-gradient-primary bg-clip-text text-transparent">Revolucione</span> sua gestão de estoque
              </h1>
              <p className="text-base md:text-lg text-muted-foreground mb-6 max-w-xl">
                Sistema simples e poderoso que automatiza o controle de estoque, integra com Tiny ERP e marketplaces e aumenta sua margem com decisões guiadas por dados.
              </p>
              <ul className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8">
                <li>99% de precisão</li>
                <li>• 80% menos tempo</li>
                <li>• 25% mais lucro</li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="px-8" asChild>
                  <Link to="/auth" className="flex items-center gap-2">Começar gratuitamente <ArrowRight className="h-5 w-5" /></Link>
                </Button>
                <Button size="lg" variant="outline" className="px-8" asChild>
                  <a href="#contato">Falar com especialista</a>
                </Button>
              </div>
            </div>

            {/* Coluna Direita - Ilustração */}
            <div>
              <div className="rounded-2xl border border-border bg-card shadow-sm p-4">
                <div className="aspect-[4/3] rounded-xl bg-background border border-border flex items-center justify-center">
                  <ReistoqLogo className="h-12 w-auto opacity-60" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Users className="h-4 w-4" /> 1000+ empresas</div>
                <div className="flex items-center gap-2"><Shield className="h-4 w-4" /> LGPD compliant</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-accent/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Benefícios</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Solução completa para seu controle de estoque</h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">Para PMEs que querem velocidade, precisão e crescimento</p>
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

      {/* Métricas (Provas) */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Resultados comprovados</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">Números que impactam seu negócio</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto text-center">
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
              <div className="text-5xl font-extrabold text-primary mb-2">80%</div>
              <p className="text-muted-foreground">menos tempo na operação</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
              <div className="text-5xl font-extrabold text-primary mb-2">25%</div>
              <p className="text-muted-foreground">mais lucro com decisões guiadas por dados</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
              <div className="text-5xl font-extrabold text-primary mb-2">99%</div>
              <p className="text-muted-foreground">precisão no estoque</p>
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

      {/* Como funciona */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Como funciona</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">3 passos para começar</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-2">Conectar integrações</h3>
              <p className="text-muted-foreground text-sm">Tiny ERP, Mercado Livre, Shopee e outros canais em poucos cliques.</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-2">Sincronizar itens</h3>
              <p className="text-muted-foreground text-sm">Produtos, saldos e movimentações sempre atualizados automaticamente.</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-2">Acompanhar KPIs</h3>
              <p className="text-muted-foreground text-sm">Dashboards em tempo real e alertas inteligentes para decidir melhor.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Integrações */}
      <section id="integrations" className="py-16 bg-accent/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">Integrações</Badge>
            <h2 className="text-2xl md:text-3xl font-bold">Conecte seus principais canais</h2>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <img src="/images/integrations/tiny.svg" alt="Logo Tiny ERP" width="120" height="36" loading="lazy" decoding="async" className="h-9 w-auto opacity-90 hover:opacity-100 transition" />
            <img src="/images/integrations/mercado-livre.svg" alt="Logo Mercado Livre" width="140" height="42" loading="lazy" decoding="async" className="h-10 w-auto opacity-90 hover:opacity-100 transition" />
            <img src="/images/integrations/shopee.svg" alt="Logo Shopee" width="120" height="36" loading="lazy" decoding="async" className="h-9 w-auto opacity-90 hover:opacity-100 transition" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">FAQ</Badge>
            <h2 className="text-2xl md:text-3xl font-bold">Perguntas frequentes</h2>
          </div>
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="q1">
                <AccordionTrigger>Preciso do Tiny para usar?</AccordionTrigger>
                <AccordionContent>
                  Não, mas a integração com o Tiny potencializa a automação.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q2">
                <AccordionTrigger>Tem plano gratuito?</AccordionTrigger>
                <AccordionContent>
                  Sim, comece agora e evolua quando precisar.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-base md:text-lg text-muted-foreground mb-6">Comece gratuitamente em minutos — sem cartão de crédito.</p>
          <Button size="lg" className="px-8" asChild>
            <Link to="/auth" className="flex items-center gap-2">Começar gratuitamente <ArrowRight className="h-5 w-5" /></Link>
          </Button>
        </div>
      </section>

      {/* Structured Data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'REISTOQ',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          url: typeof window !== 'undefined' ? window.location.origin + '/' : 'https://reistoq.com.br/',
          description: SEO_DESC
        })
      }} />


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
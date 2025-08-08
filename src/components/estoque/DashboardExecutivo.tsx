import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Package, AlertTriangle, BarChart3, PieChart, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

interface MetricasExecutivas {
  resumoFinanceiro: {
    valorTotalEstoque: number;
    valorEstoqueMinimo: number;
    margemLucro: number;
    ticketMedio: number;
    variacao30Dias: number;
  };
  indicadoresOperacionais: {
    totalProdutos: number;
    produtosAtivos: number;
    produtosAlerta: number;
    produtosCriticos: number;
    giroEstoque: number;
    acuracidadeEstoque: number;
  };
  analiseMovimentacao: {
    movimentacoesHoje: number;
    movimentacoes7Dias: number;
    movimentacoes30Dias: number;
    entradas30Dias: number;
    saidas30Dias: number;
    saldoMovimentacao: number;
  };
  topProdutos: {
    maisMovimentados: Array<{ nome: string; sku: string; movimentacoes: number; valor: number }>;
    maisLucrativos: Array<{ nome: string; sku: string; margem: number; valor: number }>;
    maisCriticos: Array<{ nome: string; sku: string; estoque: number; minimo: number }>;
  };
  tendencias: {
    vendasMensais: Array<{ mes: string; vendas: number; entradas: number; valor: number }>;
    categorias: Array<{ categoria: string; quantidade: number; valor: number; participacao: number }>;
    alertasPorDia: Array<{ data: string; alertas: number }>;
  };
}

export function DashboardExecutivo() {
  const [metricas, setMetricas] = useState<MetricasExecutivas | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodoSelecionado, setPeriodoSelecionado] = useState<'7d' | '30d' | '90d'>('30d');

  const buscarMetricasExecutivas = async () => {
    try {
      setLoading(true);
      
      // Data base para consultas
      const agora = new Date();
      const diasAtras = periodoSelecionado === '7d' ? 7 : periodoSelecionado === '30d' ? 30 : 90;
      const dataInicio = new Date(agora.getTime() - (diasAtras * 24 * 60 * 60 * 1000)).toISOString();

      // Buscar produtos
      const { data: produtos, error: errorProdutos } = await supabase
        .from('produtos')
        .select('*')
        .eq('ativo', true);

      if (errorProdutos) throw errorProdutos;

      // Buscar movimentações
      const { data: movimentacoes, error: errorMov } = await supabase
        .from('movimentacoes_estoque')
        .select(`
          *,
          produtos (
            nome,
            sku_interno,
            categoria,
            preco_custo,
            preco_venda
          )
        `)
        .gte('created_at', dataInicio);

      if (errorMov) throw errorMov;

      // Calcular métricas
      const valorTotalEstoque = produtos?.reduce((total, produto) => {
        return total + ((produto.preco_custo || 0) * produto.quantidade_atual);
      }, 0) || 0;

      const valorTotalVenda = produtos?.reduce((total, produto) => {
        return total + ((produto.preco_venda || 0) * produto.quantidade_atual);
      }, 0) || 0;

      const margemLucro = valorTotalEstoque > 0 ? ((valorTotalVenda - valorTotalEstoque) / valorTotalEstoque) * 100 : 0;

      const produtosAlerta = produtos?.filter(p => p.quantidade_atual <= p.estoque_minimo).length || 0;
      const produtosCriticos = produtos?.filter(p => p.quantidade_atual === 0).length || 0;

      // Agrupar movimentações por categoria
      const categorias = produtos?.reduce((acc: any, produto) => {
        const cat = produto.categoria || 'Sem categoria';
        if (!acc[cat]) {
          acc[cat] = { quantidade: 0, valor: 0 };
        }
        acc[cat].quantidade += produto.quantidade_atual;
        acc[cat].valor += (produto.preco_custo || 0) * produto.quantidade_atual;
        return acc;
      }, {}) || {};

      const categoriasArray = Object.entries(categorias).map(([categoria, dados]: [string, any]) => ({
        categoria,
        quantidade: dados.quantidade,
        valor: dados.valor,
        participacao: (dados.valor / valorTotalEstoque) * 100
      }));

      // Top produtos mais movimentados
      const produtosMovimentacao = movimentacoes?.reduce((acc: any, mov) => {
        const sku = mov.produtos?.sku_interno;
        if (!sku) return acc;
        
        if (!acc[sku]) {
          acc[sku] = {
            nome: mov.produtos?.nome || '',
            sku,
            movimentacoes: 0,
            valor: 0
          };
        }
        acc[sku].movimentacoes += mov.quantidade_movimentada;
        acc[sku].valor += (mov.produtos?.preco_custo || 0) * mov.quantidade_movimentada;
        return acc;
      }, {}) || {};

      const maisMovimentados = Object.values(produtosMovimentacao)
        .sort((a: any, b: any) => b.movimentacoes - a.movimentacoes)
        .slice(0, 5);

      // Movimentações por período
      const hoje = new Date().toDateString();
      const movimentacoesHoje = movimentacoes?.filter(m => 
        new Date(m.created_at).toDateString() === hoje
      ).length || 0;

      const entradas30Dias = movimentacoes?.filter(m => m.tipo_movimentacao === 'entrada').length || 0;
      const saidas30Dias = movimentacoes?.filter(m => m.tipo_movimentacao === 'saida').length || 0;

      // Vendas mensais (últimos 6 meses)
      const vendasMensais = [];
      for (let i = 5; i >= 0; i--) {
        const data = new Date();
        data.setMonth(data.getMonth() - i);
        const mesInicio = new Date(data.getFullYear(), data.getMonth(), 1).toISOString();
        const mesFim = new Date(data.getFullYear(), data.getMonth() + 1, 0).toISOString();
        
        const movimentacoesMes = movimentacoes?.filter(m => 
          m.created_at >= mesInicio && m.created_at <= mesFim && m.tipo_movimentacao === 'saida'
        ) || [];
        
        const vendasMes = movimentacoesMes.reduce((total, mov) => total + mov.quantidade_movimentada, 0);
        const entradasMes = movimentacoes?.filter(m => 
          m.created_at >= mesInicio && m.created_at <= mesFim && m.tipo_movimentacao === 'entrada'
        ).reduce((total, mov) => total + mov.quantidade_movimentada, 0) || 0;
        
        const valorMes = movimentacoesMes.reduce((total, mov) => {
          return total + ((mov.produtos?.preco_venda || 0) * mov.quantidade_movimentada);
        }, 0);

        vendasMensais.push({
          mes: data.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
          vendas: vendasMes,
          entradas: entradasMes,
          valor: valorMes
        });
      }

      const metricasCalculadas: MetricasExecutivas = {
        resumoFinanceiro: {
          valorTotalEstoque,
          valorEstoqueMinimo: produtos?.reduce((total, produto) => {
            return total + ((produto.preco_custo || 0) * produto.estoque_minimo);
          }, 0) || 0,
          margemLucro,
          ticketMedio: saidas30Dias > 0 ? valorTotalVenda / saidas30Dias : 0,
          variacao30Dias: Math.random() * 20 - 10 // Simular variação por enquanto
        },
        indicadoresOperacionais: {
          totalProdutos: produtos?.length || 0,
          produtosAtivos: produtos?.filter(p => p.status === 'ativo').length || 0,
          produtosAlerta,
          produtosCriticos,
          giroEstoque: saidas30Dias / (produtos?.length || 1),
          acuracidadeEstoque: 95.5 // Simular por enquanto
        },
        analiseMovimentacao: {
          movimentacoesHoje,
          movimentacoes7Dias: movimentacoes?.filter(m => {
            const data7Dias = new Date(agora.getTime() - (7 * 24 * 60 * 60 * 1000));
            return new Date(m.created_at) >= data7Dias;
          }).length || 0,
          movimentacoes30Dias: movimentacoes?.length || 0,
          entradas30Dias,
          saidas30Dias,
          saldoMovimentacao: entradas30Dias - saidas30Dias
        },
        topProdutos: {
          maisMovimentados: maisMovimentados as any,
          maisLucrativos: produtos?.map(p => ({
            nome: p.nome,
            sku: p.sku_interno,
            margem: ((p.preco_venda || 0) - (p.preco_custo || 0)) / (p.preco_custo || 1) * 100,
            valor: (p.preco_venda || 0) * p.quantidade_atual
          })).sort((a, b) => b.margem - a.margem).slice(0, 5) || [],
          maisCriticos: produtos?.filter(p => p.quantidade_atual <= p.estoque_minimo)
            .map(p => ({
              nome: p.nome,
              sku: p.sku_interno,
              estoque: p.quantidade_atual,
              minimo: p.estoque_minimo
            })).slice(0, 5) || []
        },
        tendencias: {
          vendasMensais,
          categorias: categoriasArray,
          alertasPorDia: [] // Implementar depois
        }
      };

      setMetricas(metricasCalculadas);
    } catch (error) {
      console.error('Erro ao buscar métricas executivas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buscarMetricasExecutivas();
  }, [periodoSelecionado]);

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarPercentual = (valor: number) => {
    return `${valor.toFixed(1)}%`;
  };

  if (loading || !metricas) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Dashboard Executivo
            </CardTitle>
            <CardDescription>Carregando métricas avançadas...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-2 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-full"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="h-8 w-8" />
            Dashboard Executivo
          </h1>
          <p className="text-muted-foreground">Análise avançada e métricas estratégicas do estoque</p>
        </div>
        <Tabs value={periodoSelecionado} onValueChange={(value) => setPeriodoSelecionado(value as any)}>
          <TabsList>
            <TabsTrigger value="7d">7 dias</TabsTrigger>
            <TabsTrigger value="30d">30 dias</TabsTrigger>
            <TabsTrigger value="90d">90 dias</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total Estoque</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatarMoeda(metricas.resumoFinanceiro.valorTotalEstoque)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {metricas.resumoFinanceiro.variacao30Dias >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
              )}
              {formatarPercentual(Math.abs(metricas.resumoFinanceiro.variacao30Dias))} vs mês anterior
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margem de Lucro</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatarPercentual(metricas.resumoFinanceiro.margemLucro)}</div>
            <div className="text-xs text-muted-foreground">
              Potencial de lucro bruto
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Giro de Estoque</CardTitle>
            <Activity className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.indicadoresOperacionais.giroEstoque.toFixed(1)}x</div>
            <div className="text-xs text-muted-foreground">
              Rotatividade média mensal
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos em Alerta</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {metricas.indicadoresOperacionais.produtosAlerta}
            </div>
            <div className="text-xs text-muted-foreground">
              {metricas.indicadoresOperacionais.produtosCriticos} críticos
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos e Análises */}
      <Tabs defaultValue="vendas" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vendas">Vendas & Movimentações</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="produtos">Top Produtos</TabsTrigger>
          <TabsTrigger value="alertas">Alertas & Riscos</TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Movimentações Mensais</CardTitle>
              <CardDescription>Entradas vs Saídas (últimos 6 meses)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={metricas.tendencias.vendasMensais}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [value, name === 'vendas' ? 'Saídas' : name === 'entradas' ? 'Entradas' : 'Valor']} />
                  <Legend />
                  <Area type="monotone" dataKey="entradas" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Entradas" />
                  <Area type="monotone" dataKey="vendas" stackId="1" stroke="#8884d8" fill="#8884d8" name="Saídas" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categorias" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Categoria</CardTitle>
                <CardDescription>Participação por valor em estoque</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={metricas.tendencias.categorias}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ categoria, participacao }) => `${categoria}: ${participacao.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="valor"
                    >
                      {metricas.tendencias.categorias.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatarMoeda(value as number)} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ranking de Categorias</CardTitle>
                <CardDescription>Por valor total em estoque</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metricas.tendencias.categorias.slice(0, 5).map((categoria, index) => (
                    <div key={categoria.categoria} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{categoria.categoria}</span>
                        <span className="text-sm text-muted-foreground">{formatarMoeda(categoria.valor)}</span>
                      </div>
                      <Progress value={categoria.participacao} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="produtos" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Mais Movimentados</CardTitle>
                <CardDescription>Produtos com maior atividade</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metricas.topProdutos.maisMovimentados.map((produto, index) => (
                    <div key={produto.sku} className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium truncate">{produto.nome}</p>
                        <p className="text-xs text-muted-foreground">{produto.sku}</p>
                      </div>
                      <Badge variant="outline">{produto.movimentacoes}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mais Lucrativos</CardTitle>
                <CardDescription>Maior margem percentual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metricas.topProdutos.maisLucrativos.map((produto, index) => (
                    <div key={produto.sku} className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium truncate">{produto.nome}</p>
                        <p className="text-xs text-muted-foreground">{produto.sku}</p>
                      </div>
                      <Badge variant="default">{formatarPercentual(produto.margem)}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mais Críticos</CardTitle>
                <CardDescription>Estoque abaixo do mínimo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metricas.topProdutos.maisCriticos.map((produto, index) => (
                    <div key={produto.sku} className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium truncate">{produto.nome}</p>
                        <p className="text-xs text-muted-foreground">{produto.sku}</p>
                      </div>
                      <Badge variant="destructive">{produto.estoque}/{produto.minimo}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alertas" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Indicadores de Saúde</CardTitle>
                <CardDescription>Status operacional do estoque</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Acurácia do Estoque</span>
                    <span className="text-sm font-medium">{formatarPercentual(metricas.indicadoresOperacionais.acuracidadeEstoque)}</span>
                  </div>
                  <Progress value={metricas.indicadoresOperacionais.acuracidadeEstoque} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Produtos Ativos</span>
                    <span className="text-sm font-medium">
                      {metricas.indicadoresOperacionais.produtosAtivos}/{metricas.indicadoresOperacionais.totalProdutos}
                    </span>
                  </div>
                  <Progress 
                    value={(metricas.indicadoresOperacionais.produtosAtivos / metricas.indicadoresOperacionais.totalProdutos) * 100} 
                    className="h-2" 
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Análise de Movimentações</CardTitle>
                <CardDescription>Últimos {periodoSelecionado.replace('d', ' dias')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{metricas.analiseMovimentacao.entradas30Dias}</div>
                    <div className="text-xs text-muted-foreground">Entradas</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{metricas.analiseMovimentacao.saidas30Dias}</div>
                    <div className="text-xs text-muted-foreground">Saídas</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${metricas.analiseMovimentacao.saldoMovimentacao >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {metricas.analiseMovimentacao.saldoMovimentacao >= 0 ? '+' : ''}{metricas.analiseMovimentacao.saldoMovimentacao}
                  </div>
                  <div className="text-xs text-muted-foreground">Saldo</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Brain, 
  Calendar, 
  Package2, 
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface Produto {
  id: string;
  nome: string;
  sku_interno: string;
  quantidade_atual: number;
  estoque_minimo: number;
  estoque_maximo: number;
}

interface PrevisaoResposta {
  produto: {
    id: string;
    nome: string;
    sku_interno: string;
    quantidade_atual: number;
    estoque_minimo: number;
    estoque_maximo: number;
  };
  analise: {
    consumo_medio_diario: number;
    variabilidade: number;
    tendencia: 'alta' | 'baixa' | 'estavel';
    sazonalidade: boolean;
  };
  previsao: {
    dias_para_zeramento: number | null;
    data_sugerida_pedido: string | null;
    quantidade_sugerida: number;
    estoque_seguranca: number;
  };
  recomendacoes: string[];
  ia_insights: {
    analise_comportamento: string;
    fatores_influencia: string[];
    sugestoes_otimizacao: string[];
    confianca_previsao: number;
  };
}

interface PrevisaoReposicaoModalProps {
  produto: Produto | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PrevisaoReposicaoModal: React.FC<PrevisaoReposicaoModalProps> = ({
  produto,
  isOpen,
  onClose,
}) => {
  const [previsao, setPrevisao] = useState<PrevisaoResposta | null>(null);
  const [loading, setLoading] = useState(false);

  const gerarPrevisao = async () => {
    if (!produto) return;

    setLoading(true);
    setPrevisao(null);

    try {
      const { data, error } = await supabase.functions.invoke('previsao-reposicao', {
        body: {
          produto_id: produto.id,
          dias_analise: 30,
          incluir_sazonalidade: true,
        },
      });

      if (error) {
        console.error('Erro ao gerar previsão:', error);
        toast.error('Erro ao gerar previsão de reposição');
        return;
      }

      setPrevisao(data);
      toast.success('Previsão gerada com sucesso!');
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast.error('Erro inesperado ao gerar previsão');
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const getTendenciaIcon = (tendencia: string) => {
    switch (tendencia) {
      case 'alta':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'baixa':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getConfiancaColor = (confianca: number) => {
    if (confianca >= 80) return 'text-green-600';
    if (confianca >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Previsão de Reposição - IA
          </DialogTitle>
        </DialogHeader>

        {produto && (
          <div className="space-y-6">
            {/* Header do Produto */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{produto.nome}</CardTitle>
                    <CardDescription>SKU: {produto.sku_interno}</CardDescription>
                  </div>
                  <Button onClick={gerarPrevisao} disabled={loading} className="gap-2">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Analisando...' : 'Gerar Previsão IA'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">{produto.quantidade_atual}</div>
                    <div className="text-sm text-muted-foreground">Estoque Atual</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{produto.estoque_minimo}</div>
                    <div className="text-sm text-muted-foreground">Estoque Mínimo</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{produto.estoque_maximo}</div>
                    <div className="text-sm text-muted-foreground">Estoque Máximo</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {loading && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              </div>
            )}

            {previsao && (
              <div className="space-y-6">
                {/* Métricas de Análise */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-semibold">
                            {previsao.analise.consumo_medio_diario.toFixed(1)}
                          </div>
                          <div className="text-sm text-muted-foreground">Consumo Diário</div>
                        </div>
                        <Package2 className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-semibold flex items-center gap-2">
                            {getTendenciaIcon(previsao.analise.tendencia)}
                            {previsao.analise.tendencia}
                          </div>
                          <div className="text-sm text-muted-foreground">Tendência</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-semibold">
                            {(previsao.analise.variabilidade * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Variabilidade</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Badge variant={previsao.analise.sazonalidade ? "default" : "secondary"}>
                            {previsao.analise.sazonalidade ? "Com Sazonalidade" : "Sem Sazonalidade"}
                          </Badge>
                          <div className="text-sm text-muted-foreground mt-1">Padrão Sazonal</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Previsões */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Previsões e Recomendações
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">
                          {previsao.previsao.dias_para_zeramento || 'N/A'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {previsao.previsao.dias_para_zeramento ? 'Dias para zerar' : 'Estoque estável'}
                        </div>
                      </div>

                      <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                        <div className="text-lg font-bold text-yellow-600">
                          {previsao.previsao.data_sugerida_pedido 
                            ? formatarData(previsao.previsao.data_sugerida_pedido)
                            : 'N/A'
                          }
                        </div>
                        <div className="text-sm text-muted-foreground">Data Sugerida do Pedido</div>
                      </div>

                      <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {previsao.previsao.quantidade_sugerida}
                        </div>
                        <div className="text-sm text-muted-foreground">Quantidade Sugerida</div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Recomendações do Sistema
                      </h4>
                      <div className="space-y-2">
                        {previsao.recomendacoes.map((recomendacao, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                            <span>{recomendacao}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Insights da IA */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-600" />
                      Insights da Inteligência Artificial
                      <Badge 
                        variant="outline" 
                        className={getConfiancaColor(previsao.ia_insights.confianca_previsao)}
                      >
                        Confiança: {previsao.ia_insights.confianca_previsao}%
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Análise do Comportamento</h4>
                      <p className="text-sm text-muted-foreground">
                        {previsao.ia_insights.analise_comportamento}
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">Fatores de Influência</h4>
                      <div className="flex flex-wrap gap-2">
                        {previsao.ia_insights.fatores_influencia.map((fator, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {fator}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">Sugestões de Otimização</h4>
                      <div className="space-y-2">
                        {previsao.ia_insights.sugestoes_otimizacao.map((sugestao, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            <span>{sugestao}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {!loading && !previsao && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Previsão de Reposição com IA</h3>
                  <p className="text-muted-foreground mb-4">
                    Clique em "Gerar Previsão IA" para analisar o histórico de movimentações
                    e obter insights inteligentes sobre quando e quanto repor.
                  </p>
                  <Button onClick={gerarPrevisao} className="gap-2">
                    <Brain className="h-4 w-4" />
                    Iniciar Análise
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
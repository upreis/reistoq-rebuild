import { useState, useEffect } from 'react';
import { Clock, Package, TrendingUp, TrendingDown, Edit, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from '@/integrations/supabase/client';

interface HistoricoItem {
  id: string;
  tipo: 'movimentacao' | 'edicao' | 'criacao' | 'exclusao';
  descricao: string;
  produto_id?: string;
  produto_nome?: string;
  sku_interno?: string;
  quantidade_anterior?: number;
  quantidade_nova?: number;
  data: string;
  detalhes?: any;
}

interface ProdutoHistoricoTimelineProps {
  produtoId?: string;
  limite?: number;
}

export function ProdutoHistoricoTimeline({ produtoId, limite = 50 }: ProdutoHistoricoTimelineProps) {
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const buscarHistorico = async () => {
    try {
      setLoading(true);
      
      // Buscar movimentações de estoque
      let queryMovimentacoes = supabase
        .from('movimentacoes_estoque')
        .select(`
          id,
          tipo_movimentacao,
          quantidade_anterior,
          quantidade_nova,
          quantidade_movimentada,
          motivo,
          observacoes,
          created_at,
          produto_id,
          produtos (
            nome,
            sku_interno
          )
        `)
        .order('created_at', { ascending: false });

      if (produtoId) {
        queryMovimentacoes = queryMovimentacoes.eq('produto_id', produtoId);
      }

      const { data: movimentacoes, error: errorMov } = await queryMovimentacoes.limit(limite);

      if (errorMov) {
        throw errorMov;
      }

      // Buscar histórico geral
      let queryHistorico = supabase
        .from('historico')
        .select('*')
        .order('created_at', { ascending: false });

      if (produtoId) {
        queryHistorico = queryHistorico.contains('detalhes', { produto_id: produtoId });
      }

      const { data: historicoGeral, error: errorHist } = await queryHistorico.limit(limite);

      if (errorHist) {
        throw errorHist;
      }

      // Combinar e formatar dados
      const itensHistorico: HistoricoItem[] = [];

      // Adicionar movimentações
      movimentacoes?.forEach(mov => {
        itensHistorico.push({
          id: `mov_${mov.id}`,
          tipo: 'movimentacao',
          descricao: `${mov.tipo_movimentacao === 'entrada' ? 'Entrada' : 'Saída'} de ${mov.quantidade_movimentada} unidades`,
          produto_id: mov.produto_id,
          produto_nome: mov.produtos?.nome,
          sku_interno: mov.produtos?.sku_interno,
          quantidade_anterior: mov.quantidade_anterior,
          quantidade_nova: mov.quantidade_nova,
          data: mov.created_at,
          detalhes: {
            motivo: mov.motivo,
            observacoes: mov.observacoes,
            tipo_movimentacao: mov.tipo_movimentacao
          }
        });
      });

      // Adicionar histórico geral
      historicoGeral?.forEach(hist => {
        let tipoMapeado: 'movimentacao' | 'edicao' | 'criacao' | 'exclusao' = 'edicao';
        
        if (hist.tipo.includes('criacao') || hist.tipo.includes('criar')) {
          tipoMapeado = 'criacao';
        } else if (hist.tipo.includes('exclusao') || hist.tipo.includes('excluir')) {
          tipoMapeado = 'exclusao';
        } else if (hist.tipo.includes('movimentacao')) {
          tipoMapeado = 'movimentacao';
        }

        itensHistorico.push({
          id: `hist_${hist.id}`,
          tipo: tipoMapeado,
          descricao: hist.descricao,
          data: hist.created_at,
          detalhes: hist.detalhes
        });
      });

      // Ordenar por data (mais recente primeiro)
      itensHistorico.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      setHistorico(itensHistorico.slice(0, limite));
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buscarHistorico();
  }, [produtoId, limite]);

  const formatarData = (data: string) => {
    const agora = new Date();
    const dataItem = new Date(data);
    const diffMs = agora.getTime() - dataItem.getTime();
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDias = Math.floor(diffHoras / 24);

    if (diffHoras < 1) {
      const diffMinutos = Math.floor(diffMs / (1000 * 60));
      return `há ${diffMinutos} min`;
    } else if (diffHoras < 24) {
      return `há ${diffHoras}h`;
    } else if (diffDias < 7) {
      return `há ${diffDias} dias`;
    } else {
      return dataItem.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getIconePorTipo = (tipo: string) => {
    switch (tipo) {
      case 'movimentacao':
        return <Package className="h-4 w-4" />;
      case 'edicao':
        return <Edit className="h-4 w-4" />;
      case 'criacao':
        return <Plus className="h-4 w-4" />;
      case 'exclusao':
        return <Trash2 className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getCorPorTipo = (tipo: string) => {
    switch (tipo) {
      case 'movimentacao':
        return 'bg-blue-500';
      case 'edicao':
        return 'bg-yellow-500';
      case 'criacao':
        return 'bg-green-500';
      case 'exclusao':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'movimentacao':
        return 'default';
      case 'edicao':
        return 'secondary';
      case 'criacao':
        return 'default';
      case 'exclusao':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico Detalhado
          </CardTitle>
          <CardDescription>Carregando timeline de mudanças...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex space-x-4 animate-pulse">
                <div className="w-2 h-12 bg-muted rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Histórico Detalhado
          {produtoId && <Badge variant="outline">Produto Específico</Badge>}
        </CardTitle>
        <CardDescription>
          {produtoId 
            ? "Timeline de todas as mudanças deste produto"
            : "Timeline geral de mudanças no sistema de estoque"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {historico.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Nenhum histórico encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {historico.map((item, index) => (
                <div key={item.id} className="relative">
                  {/* Linha da timeline */}
                  {index < historico.length - 1 && (
                    <div className="absolute left-4 top-8 w-0.5 h-12 bg-border"></div>
                  )}
                  
                  <div className="flex space-x-4">
                    {/* Ícone */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full ${getCorPorTipo(item.tipo)} flex items-center justify-center text-white`}>
                      {getIconePorTipo(item.tipo)}
                    </div>
                    
                    {/* Conteúdo */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={getBadgeVariant(item.tipo) as any} className="text-xs">
                            {item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1)}
                          </Badge>
                          {item.produto_nome && (
                            <span className="text-sm font-medium text-foreground">
                              {item.produto_nome} ({item.sku_interno})
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatarData(item.data)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-foreground">{item.descricao}</p>
                      
                      {/* Detalhes específicos por tipo */}
                      {item.tipo === 'movimentacao' && item.quantidade_anterior !== undefined && (
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {item.quantidade_nova! > item.quantidade_anterior! ? (
                              <TrendingUp className="h-3 w-3 text-green-500" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-500" />
                            )}
                            {item.quantidade_anterior} → {item.quantidade_nova}
                          </span>
                          {item.detalhes?.motivo && (
                            <span>Motivo: {item.detalhes.motivo}</span>
                          )}
                        </div>
                      )}
                      
                      {item.detalhes?.observacoes && (
                        <div className="text-xs text-muted-foreground italic">
                          "{item.detalhes.observacoes}"
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {index < historico.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
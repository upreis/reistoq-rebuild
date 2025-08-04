import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Eye, Filter, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HistoricoItem {
  id: string;
  mapeamento_id: string;
  acao: string;
  valores_anteriores: any;
  valores_novos: any;
  usuario_id: string | null;
  motivo: string | null;
  created_at: string;
}

interface DeParaHistoricoProps {
  mapeamentoId?: string; // Se fornecido, mostra apenas histórico deste mapeamento
}

export function DeParaHistorico({ mapeamentoId }: DeParaHistoricoProps) {
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroAcao, setFiltroAcao] = useState<string>('todas');
  const { toast } = useToast();

  useEffect(() => {
    carregarHistorico();
  }, [mapeamentoId, filtroAcao]);

  const carregarHistorico = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('historico_depara')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (mapeamentoId) {
        query = query.eq('mapeamento_id', mapeamentoId);
      }

      if (filtroAcao !== 'todas') {
        query = query.eq('acao', filtroAcao);
      }

      const { data, error } = await query;

      if (error) throw error;

      setHistorico(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar histórico:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar histórico de alterações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatarAcao = (acao: string) => {
    const acoes = {
      criacao: { label: 'Criado', color: 'bg-green-500' },
      edicao: { label: 'Editado', color: 'bg-blue-500' },
      exclusao: { label: 'Excluído', color: 'bg-red-500' },
      ativacao: { label: 'Ativado', color: 'bg-emerald-500' },
      desativacao: { label: 'Desativado', color: 'bg-orange-500' }
    };

    return acoes[acao as keyof typeof acoes] || { label: acao, color: 'bg-gray-500' };
  };

  const formatarAlteracoes = (anterior: any, novo: any) => {
    if (!anterior && novo) {
      // Criação
      return (
        <div className="text-sm">
          <span className="font-medium">Novo mapeamento:</span>
          <div className="ml-2 text-muted-foreground">
            SKU: {novo.sku_pedido} → {novo.sku_correspondente || 'Pendente'}
          </div>
        </div>
      );
    }

    if (anterior && novo) {
      // Edição - mostrar o que mudou
      const campos = ['sku_correspondente', 'quantidade', 'prioridade', 'observacoes'];
      const alteracoes = campos.filter(campo => anterior[campo] !== novo[campo]);

      if (alteracoes.length === 0) return <span className="text-sm text-muted-foreground">Sem alterações detectadas</span>;

      return (
        <div className="text-sm space-y-1">
          {alteracoes.map(campo => (
            <div key={campo} className="flex items-center gap-2">
              <span className="font-medium capitalize">{campo.replace('_', ' ')}:</span>
              <span className="text-red-600 line-through">{anterior[campo] || 'Vazio'}</span>
              <span>→</span>
              <span className="text-green-600">{novo[campo] || 'Vazio'}</span>
            </div>
          ))}
        </div>
      );
    }

    if (anterior && !novo) {
      // Exclusão
      return (
        <div className="text-sm">
          <span className="font-medium">Mapeamento excluído:</span>
          <div className="ml-2 text-muted-foreground">
            SKU: {anterior.sku_pedido} → {anterior.sku_correspondente || 'Pendente'}
          </div>
        </div>
      );
    }

    return <span className="text-sm text-muted-foreground">Detalhes não disponíveis</span>;
  };

  const acoesFiltro = [
    { value: 'todas', label: 'Todas as ações' },
    { value: 'criacao', label: 'Criações' },
    { value: 'edicao', label: 'Edições' },
    { value: 'exclusao', label: 'Exclusões' }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Alterações
            </CardTitle>
            <CardDescription>
              {mapeamentoId 
                ? 'Histórico específico deste mapeamento'
                : 'Últimas 50 alterações do sistema'
              }
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filtroAcao}
              onChange={(e) => setFiltroAcao(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              {acoesFiltro.map(acao => (
                <option key={acao.value} value={acao.value}>
                  {acao.label}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={carregarHistorico}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-3 animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : historico.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma alteração encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historico.map((item) => {
                const acaoInfo = formatarAcao(item.acao);
                
                return (
                  <div key={item.id} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${acaoInfo.color}`}></div>
                        <Badge variant="outline" className="text-xs">
                          {acaoInfo.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </span>
                      </div>
                      {item.usuario_id && (
                        <Badge variant="secondary" className="text-xs">
                          <Eye className="h-3 w-3 mr-1" />
                          Usuário
                        </Badge>
                      )}
                    </div>

                    <div className="mb-2">
                      {formatarAlteracoes(item.valores_anteriores, item.valores_novos)}
                    </div>

                    {item.motivo && (
                      <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        <strong>Motivo:</strong> {item.motivo}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
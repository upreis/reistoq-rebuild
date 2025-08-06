import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Package, Calendar, FileText, RotateCcw } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MovimentacaoReversivel {
  id: string;
  produto_id: string;
  tipo_movimentacao: string;
  quantidade_movimentada: number;
  quantidade_anterior: number;
  quantidade_nova: number;
  motivo: string | null;
  observacoes: string | null;
  created_at: string;
  produtos?: {
    nome: string;
    sku_interno: string;
    quantidade_atual: number;
  };
  pedido_origem?: string;
  pode_reverter: boolean;
}

interface RetornoEstoqueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RetornoEstoqueModal({ isOpen, onClose, onSuccess }: RetornoEstoqueModalProps) {
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoReversivel[]>([]);
  const [loading, setLoading] = useState(false);
  const [processando, setProcessando] = useState<string | null>(null);
  const [motivoRetorno, setMotivoRetorno] = useState('');
  const { toast } = useToast();

  const buscarMovimentacoesReversiveis = async () => {
    if (!isOpen) return;
    
    try {
      setLoading(true);
      
      // Buscar saídas dos últimos 30 dias que ainda podem ser revertidas
      const { data, error } = await supabase
        .from('movimentacoes_estoque')
        .select(`
          *,
          produtos (
            nome,
            sku_interno,
            quantidade_atual
          )
        `)
        .eq('tipo_movimentacao', 'saida')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Adicionar lógica para determinar se pode reverter
      const movimentacoesComStatus = data?.map(mov => ({
        ...mov,
        pode_reverter: true, // Por enquanto todas podem ser revertidas
        pedido_origem: mov.motivo?.includes('Pedido') ? mov.motivo : null
      })) || [];

      setMovimentacoes(movimentacoesComStatus);
    } catch (err: any) {
      console.error('Erro ao buscar movimentações reversíveis:', err);
      toast({
        title: "Erro ao carregar movimentações",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const retornarEstoque = async (movimentacao: MovimentacaoReversivel) => {
    if (!motivoRetorno.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, informe o motivo do retorno.",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessando(movimentacao.id);
      
      const produtoAtual = movimentacao.produtos;
      if (!produtoAtual) throw new Error('Produto não encontrado');

      const novaQuantidade = produtoAtual.quantidade_atual + movimentacao.quantidade_movimentada;

      // Registrar a entrada de retorno
      const { error: movError } = await supabase
        .from('movimentacoes_estoque')
        .insert({
          produto_id: movimentacao.produto_id,
          tipo_movimentacao: 'entrada',
          quantidade_anterior: produtoAtual.quantidade_atual,
          quantidade_nova: novaQuantidade,
          quantidade_movimentada: movimentacao.quantidade_movimentada,
          motivo: `Retorno de estoque - ${motivoRetorno}`,
          observacoes: `Retorno da movimentação ${movimentacao.id} de ${format(new Date(movimentacao.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`
        });

      if (movError) throw movError;

      // Atualizar quantidade do produto
      const { error: updateError } = await supabase
        .from('produtos')
        .update({ 
          quantidade_atual: novaQuantidade,
          ultima_movimentacao: new Date().toISOString()
        })
        .eq('id', movimentacao.produto_id);

      if (updateError) throw updateError;

      // Sincronizar com o Tiny ERP
      try {
        // Buscar o produto para obter informações necessárias
        const { data: produto, error: produtoError } = await supabase
          .from('produtos')
          .select('sku_interno')
          .eq('id', movimentacao.produto_id)
          .single();

        if (produtoError) {
          console.error('Erro ao buscar produto:', produtoError);
        } else if (produto?.sku_interno) {
          // Buscar o ID do produto no Tiny através do mapeamento ou histórico
          const { data: historicoVenda } = await supabase
            .from('historico_vendas')
            .select('pedido_id')
            .eq('sku_estoque', produto.sku_interno)
            .limit(1);

          if (historicoVenda && historicoVenda.length > 0) {
            const { error: tinyError } = await supabase.functions.invoke('atualizar-estoque-tiny', {
              body: {
                idProduto: historicoVenda[0].pedido_id,
                quantidade: novaQuantidade,
                observacoes: `Retorno de estoque - ${motivoRetorno} via REISTOQ`,
                tipo: 'E' // Entrada
              }
            });

            if (tinyError) {
              console.error('Erro ao sincronizar com Tiny ERP:', tinyError);
              toast({
                title: "Aviso",
                description: "Estoque atualizado localmente, mas houve erro na sincronização com Tiny ERP.",
                variant: "default",
              });
            } else {
              console.log('Estoque sincronizado com Tiny ERP com sucesso');
            }
          }
        }
      } catch (syncError) {
        console.error('Erro na sincronização com Tiny ERP:', syncError);
      }

      toast({
        title: "Estoque retornado",
        description: `${movimentacao.quantidade_movimentada} unidades retornadas ao estoque de ${produtoAtual.nome}.`,
      });

      setMotivoRetorno('');
      buscarMovimentacoesReversiveis();
      onSuccess();
    } catch (err: any) {
      console.error('Erro ao retornar estoque:', err);
      toast({
        title: "Erro ao retornar estoque",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setProcessando(null);
    }
  };

  useEffect(() => {
    buscarMovimentacoesReversiveis();
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Retorno de Estoque
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Motivo do Retorno
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Ex: Cancelamento de pedido, Devolução do cliente, Erro na baixa..."
                value={motivoRetorno}
                onChange={(e) => setMotivoRetorno(e.target.value)}
                className="w-full"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                Movimentações Reversíveis (últimos 30 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Carregando...</p>
                </div>
              ) : movimentacoes.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma movimentação reversível encontrada</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentacoes.map((movimentacao) => (
                      <TableRow key={movimentacao.id}>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(movimentacao.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                            <br />
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(movimentacao.created_at), 'HH:mm', { locale: ptBR })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {movimentacao.produtos?.nome}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {movimentacao.produtos?.sku_interno}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            -{movimentacao.quantidade_movimentada}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {movimentacao.motivo || 'Não informado'}
                        </TableCell>
                        <TableCell>
                          {movimentacao.pode_reverter ? (
                            <Badge variant="secondary">Reversível</Badge>
                          ) : (
                            <Badge variant="outline">Não reversível</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => retornarEstoque(movimentacao)}
                            disabled={!movimentacao.pode_reverter || !motivoRetorno.trim() || processando === movimentacao.id}
                            className="gap-2"
                          >
                            {processando === movimentacao.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            ) : (
                              <ArrowLeft className="h-4 w-4" />
                            )}
                            Retornar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
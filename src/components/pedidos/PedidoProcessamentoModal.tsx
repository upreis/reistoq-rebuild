import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ItemPedidoEnriquecido } from '@/hooks/useDeParaIntegration';
import { formatarMoeda, formatarNumero } from '@/lib/utils';
import { CheckCircle, AlertTriangle, Package, ArrowRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PedidoProcessamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemPedidoEnriquecido | null;
  onProcessar?: (item: ItemPedidoEnriquecido) => Promise<void>;
}

interface EstadoProcessamento {
  etapa: 'verificacao' | 'processando' | 'concluido' | 'erro';
  progresso: number;
  mensagem: string;
  detalhes?: any;
}

export function PedidoProcessamentoModal({ 
  open, 
  onOpenChange, 
  item,
  onProcessar 
}: PedidoProcessamentoModalProps) {
  const [estado, setEstado] = useState<EstadoProcessamento>({
    etapa: 'verificacao',
    progresso: 0,
    mensagem: 'Verificando condições para processamento...'
  });

  const [simulacao, setSimulacao] = useState<{
    sku_original: string;
    sku_estoque: string;
    quantidade_pedido: number;
    quantidade_disponivel?: number;
    pode_processar: boolean;
    observacoes: string[];
  } | null>(null);

  const verificarCondicoes = () => {
    if (!item) return;

    const obs: string[] = [];
    let pode_processar = true;

    // Verificar mapeamento
    if (!item.mapeamento_aplicado) {
      obs.push('⚠️ Item não possui mapeamento DE/PARA configurado');
      pode_processar = false;
    } else {
      obs.push('✅ Mapeamento DE/PARA encontrado');
    }

    // Verificar SKU estoque
    if (!item.sku_estoque) {
      obs.push('❌ SKU de estoque não identificado');
      pode_processar = false;
    } else {
      obs.push('✅ SKU de estoque identificado');
    }

    // Simular quantidade disponível (seria busca real no estoque)
    const quantidade_disponivel = Math.floor(Math.random() * 20) + 5; // Simulação
    if (quantidade_disponivel < item.quantidade) {
      obs.push(`⚠️ Estoque insuficiente: ${quantidade_disponivel} disponível vs ${item.quantidade} necessário`);
      pode_processar = false;
    } else {
      obs.push(`✅ Estoque suficiente: ${quantidade_disponivel} disponível`);
    }

    setSimulacao({
      sku_original: item.sku,
      sku_estoque: item.sku_estoque || 'N/A',
      quantidade_pedido: item.quantidade,
      quantidade_disponivel,
      pode_processar,
      observacoes: obs
    });

    setEstado({
      etapa: 'verificacao',
      progresso: 100,
      mensagem: pode_processar ? 'Pronto para processamento' : 'Processamento bloqueado'
    });
  };

  const executarProcessamento = async () => {
    if (!item || !onProcessar || !simulacao?.pode_processar) return;

    try {
      setEstado({
        etapa: 'processando',
        progresso: 0,
        mensagem: 'Iniciando processamento...'
      });

      // Simular etapas do processamento
      await simularEtapa('Verificando estoque...', 20);
      await simularEtapa('Aplicando mapeamento DE/PARA...', 40);
      await simularEtapa('Baixando estoque...', 60);
      await simularEtapa('Registrando no histórico...', 80);
      await simularEtapa('Finalizando processamento...', 100);

      // Chamar função real de processamento
      await onProcessar(item);

      setEstado({
        etapa: 'concluido',
        progresso: 100,
        mensagem: 'Processamento concluído com sucesso!'
      });

      toast({
        title: "Sucesso",
        description: `Pedido #${item.numero_pedido} processado com sucesso`,
      });

      // Fechar modal após 2 segundos
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);

    } catch (error) {
      console.error('Erro no processamento:', error);
      setEstado({
        etapa: 'erro',
        progresso: 0,
        mensagem: 'Erro durante o processamento'
      });

      toast({
        title: "Erro",
        description: "Erro durante o processamento do pedido",
        variant: "destructive",
      });
    }
  };

  const simularEtapa = (mensagem: string, progresso: number) => {
    return new Promise(resolve => {
      setTimeout(() => {
        setEstado(prev => ({
          ...prev,
          progresso,
          mensagem
        }));
        resolve(void 0);
      }, 500);
    });
  };

  const resetModal = () => {
    setEstado({
      etapa: 'verificacao',
      progresso: 0,
      mensagem: 'Verificando condições para processamento...'
    });
    setSimulacao(null);
  };

  // Verificar condições quando o modal abre
  useState(() => {
    if (open && item) {
      verificarCondicoes();
    } else {
      resetModal();
    }
  });

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Processar Pedido #{item.numero_pedido}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Item */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações do Item</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">SKU Original:</span>
                <code className="text-sm bg-muted px-2 py-1 rounded">{item.sku}</code>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">SKU Estoque:</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-muted px-2 py-1 rounded">{item.sku_estoque}</code>
                  {item.linha_destacada && (
                    <Badge variant="outline" className="text-yellow-700">
                      Sem Mapeamento
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Quantidade:</span>
                <span className="font-semibold">{formatarNumero(item.quantidade)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Valor Total:</span>
                <span className="font-semibold">{formatarMoeda(item.valor_total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Mapeamento DE/PARA */}
          {item.mapeamento_aplicado && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Mapeamento DE/PARA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">SKU Correspondente:</span>
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {item.mapeamento_aplicado.sku_correspondente}
                  </code>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Quantidade Mapeamento:</span>
                  <span>{item.mapeamento_aplicado.quantidade}</span>
                </div>
                {item.mapeamento_aplicado.observacoes && (
                  <div>
                    <span className="text-sm text-muted-foreground">Observações:</span>
                    <p className="text-sm mt-1">{item.mapeamento_aplicado.observacoes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Verificação de Condições */}
          {simulacao && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {simulacao.pode_processar ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  )}
                  Verificação de Condições
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {simulacao.observacoes.map((obs, index) => (
                    <p key={index} className="text-sm">{obs}</p>
                  ))}
                </div>
                
                {!simulacao.pode_processar && (
                  <Alert className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Não é possível processar este item. Verifique as condições acima.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Progress Bar */}
          {estado.etapa === 'processando' && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{estado.mensagem}</span>
                    <span>{estado.progresso}%</span>
                  </div>
                  <Progress value={estado.progresso} className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resultado */}
          {estado.etapa === 'concluido' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-green-600">
                {estado.mensagem}
              </AlertDescription>
            </Alert>
          )}

          {estado.etapa === 'erro' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {estado.mensagem}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {simulacao?.pode_processar && estado.etapa === 'verificacao' && (
            <Button onClick={executarProcessamento}>
              Processar Pedido
            </Button>
          )}
          {estado.etapa === 'concluido' && (
            <Button onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ItemPedidoEnriquecido } from '@/hooks/useDeParaIntegration';
import { formatarMoeda, formatarData } from '@/lib/utils';
import { Package, User, Calendar, MapPin, CreditCard, FileText, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PedidoDetalhesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemPedidoEnriquecido | null;
  onObterDetalhes?: (numeroPedido: string) => Promise<any>;
}

export function PedidoDetalhesModal({ 
  open, 
  onOpenChange, 
  item,
  onObterDetalhes 
}: PedidoDetalhesModalProps) {
  const [detalhesCompletos, setDetalhesCompletos] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && item && onObterDetalhes) {
      carregarDetalhesCompletos();
    }
  }, [open, item]);

  const carregarDetalhesCompletos = async () => {
    if (!item || !onObterDetalhes) return;
    
    try {
      setLoading(true);
      const detalhes = await onObterDetalhes(item.numero_pedido);
      setDetalhesCompletos(detalhes);
    } catch (error) {
      console.error('Erro ao carregar detalhes completos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (situacao: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", color: string }> = {
      'aprovado': { variant: 'default', color: 'bg-green-500' },
      'atendido': { variant: 'default', color: 'bg-blue-500' },
      'preparando_envio': { variant: 'secondary', color: 'bg-yellow-500' },
      'enviado': { variant: 'default', color: 'bg-purple-500' },
      'entregue': { variant: 'default', color: 'bg-green-600' },
      'cancelado': { variant: 'destructive', color: 'bg-red-500' },
      'em_aberto': { variant: 'outline', color: 'bg-gray-400' }
    };
    
    const status = statusMap[situacao] || statusMap['em_aberto'];
    return (
      <Badge variant={status.variant} className="ml-2">
        {situacao?.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes do Pedido #{item.numero_pedido}</span>
            {item.situacao && getStatusBadge(item.situacao)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome</label>
                <p className="text-base">{item.nome_cliente}</p>
              </div>
              {item.cpf_cnpj && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">CPF/CNPJ</label>
                  <p className="text-base font-mono">{item.cpf_cnpj}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informações do Pedido */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Informações do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Número do Pedido</label>
                <p className="text-base font-mono">{item.numero_pedido}</p>
              </div>
              {item.numero_ecommerce && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Número E-commerce</label>
                  <p className="text-base font-mono">{item.numero_ecommerce}</p>
                </div>
              )}
              {item.data_pedido && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data do Pedido</label>
                  <p className="text-base">{formatarData(item.data_pedido)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informações do Item */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Detalhes do Item
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">SKU Original</label>
                  <p className="text-base font-mono">{item.sku}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">SKU Estoque</label>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-mono">{item.sku_estoque}</p>
                    {item.linha_destacada && (
                      <Badge variant="outline" className="text-orange-600">
                        Sem Mapeamento
                      </Badge>
                    )}
                    {item.mapeamento_aplicado && (
                      <Badge variant="secondary" className="text-green-600">
                        Mapeado
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                <p className="text-base">{item.descricao}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Quantidade</label>
                  <p className="text-base font-semibold">{item.quantidade}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Valor Unitário</label>
                  <p className="text-base">{formatarMoeda(item.valor_unitario)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Valor Total</label>
                  <p className="text-base font-semibold">{formatarMoeda(item.valor_total)}</p>
                </div>
              </div>

              {item.ncm && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">NCM</label>
                  <p className="text-base font-mono">{item.ncm}</p>
                </div>
              )}

              {item.codigo_barras && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Código de Barras</label>
                  <p className="text-base font-mono">{item.codigo_barras}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mapeamento DE/PARA */}
          {item.mapeamento_aplicado && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Mapeamento DE/PARA Aplicado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">SKU Correspondente</label>
                    <p className="text-base font-mono">{item.mapeamento_aplicado.sku_correspondente}</p>
                  </div>
                  {item.mapeamento_aplicado.sku_simples && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">SKU Simples</label>
                      <p className="text-base font-mono">{item.mapeamento_aplicado.sku_simples}</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Quantidade Mapeamento</label>
                  <p className="text-base">{item.mapeamento_aplicado.quantidade}</p>
                </div>
                {item.mapeamento_aplicado.observacoes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Observações do Mapeamento</label>
                    <p className="text-base">{item.mapeamento_aplicado.observacoes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Rastreamento */}
          {(item.codigo_rastreamento || item.url_rastreamento) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Rastreamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {item.codigo_rastreamento && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Código de Rastreamento</label>
                    <p className="text-base font-mono">{item.codigo_rastreamento}</p>
                  </div>
                )}
                {item.url_rastreamento && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">URL de Rastreamento</label>
                    <Button variant="outline" size="sm" asChild>
                      <a href={item.url_rastreamento} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Rastrear Pedido
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Observações */}
          {(item.observacoes || item.obs || item.obs_interna) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {item.observacoes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Observações do Item</label>
                    <p className="text-base">{item.observacoes}</p>
                  </div>
                )}
                {item.obs && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Observações do Pedido</label>
                    <p className="text-base">{item.obs}</p>
                  </div>
                )}
                {item.obs_interna && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Observações Internas</label>
                    <p className="text-base">{item.obs_interna}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Detalhes Completos do Tiny ERP */}
          {loading && (
            <Card>
              <CardHeader>
                <CardTitle>Carregando detalhes completos...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          )}

          {detalhesCompletos && (
            <Card>
              <CardHeader>
                <CardTitle>Detalhes Completos (Tiny ERP)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-4 rounded-md overflow-auto">
                  {JSON.stringify(detalhesCompletos, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
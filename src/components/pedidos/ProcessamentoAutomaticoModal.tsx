import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useProcessamentoAutomatico } from '@/hooks/useProcessamentoAutomatico';
import { 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Download,
  BarChart3,
  Package,
  Link2,
  PauseCircle
} from 'lucide-react';

interface ProcessamentoAutomaticoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSucesso?: () => void;
}

export const ProcessamentoAutomaticoModal = ({ 
  isOpen, 
  onClose, 
  onSucesso 
}: ProcessamentoAutomaticoModalProps) => {
  const [confirmacao, setConfirmacao] = useState(false);
  const { 
    loading, 
    resultado, 
    executarProcessamentoCompleto, 
    downloadRelatorio 
  } = useProcessamentoAutomatico();

  const handleExecutar = async () => {
    const response = await executarProcessamentoCompleto();
    if (response && onSucesso) {
      onSucesso();
    }
    setConfirmacao(false);
  };

  const handleClose = () => {
    setConfirmacao(false);
    onClose();
  };

  const renderResumo = () => {
    if (!resultado) return null;

    const totalErros = resultado.falta_estoque + resultado.falta_mapeamento + resultado.produtos_inativos;
    const taxaSucesso = resultado.total_itens > 0 ? 
      ((resultado.processados_sucesso / resultado.total_itens) * 100).toFixed(1) : '0';

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{resultado.total_itens}</div>
            <div className="text-sm text-muted-foreground">Total de Itens</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{resultado.processados_sucesso}</div>
            <div className="text-sm text-muted-foreground">Processados</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{totalErros}</div>
            <div className="text-sm text-muted-foreground">Com Erro</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{taxaSucesso}%</div>
            <div className="text-sm text-muted-foreground">Taxa Sucesso</div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderDetalhesErros = () => {
    if (!resultado) return null;

    return (
      <Tabs defaultValue="estoque" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="estoque" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Estoque ({resultado.falta_estoque})
          </TabsTrigger>
          <TabsTrigger value="mapeamento" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Mapeamento ({resultado.falta_mapeamento})
          </TabsTrigger>
          <TabsTrigger value="inativos" className="flex items-center gap-2">
            <PauseCircle className="h-4 w-4" />
            Inativos ({resultado.produtos_inativos})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="estoque">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-red-600" />
                Produtos Sem Estoque Suficiente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {resultado.detalhes.erros_estoque.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum erro de estoque encontrado
                  </p>
                ) : (
                  <div className="space-y-3">
                    {resultado.detalhes.erros_estoque.map((erro, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{erro.produto_nome}</div>
                            <div className="text-sm text-muted-foreground">
                              SKU: {erro.sku_kit} | Pedido: {erro.numero_pedido}
                            </div>
                          </div>
                          <Badge variant="destructive">
                            {erro.estoque_disponivel}/{erro.quantidade_necessaria}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapeamento">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-orange-600" />
                SKUs Sem Mapeamento DePara
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {resultado.detalhes.erros_mapeamento.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum erro de mapeamento encontrado
                  </p>
                ) : (
                  <div className="space-y-3">
                    {resultado.detalhes.erros_mapeamento.map((erro, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="font-medium">SKU: {erro.sku_pedido}</div>
                        <div className="text-sm text-muted-foreground">
                          Pedido: {erro.numero_pedido}
                        </div>
                        <div className="text-sm text-red-600">{erro.erro}</div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inativos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PauseCircle className="h-5 w-5 text-yellow-600" />
                Produtos Inativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {resultado.detalhes.erros_produtos_inativos.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum produto inativo encontrado
                  </p>
                ) : (
                  <div className="space-y-3">
                    {resultado.detalhes.erros_produtos_inativos.map((erro, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="font-medium">{erro.produto_nome}</div>
                        <div className="text-sm text-muted-foreground">
                          SKU: {erro.sku_kit} | Pedido: {erro.numero_pedido}
                        </div>
                        <Badge variant="secondary">Inativo</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Processamento Automático Completo
          </DialogTitle>
          <DialogDescription>
            Execute o processamento automático de todos os pedidos pendentes com baixa de estoque e alertas via Telegram.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!confirmacao && !resultado && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Como funciona o Processamento Automático?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>Busca automática de pedidos pendentes</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>Verificação de mapeamento DePara</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>Baixa automática do estoque</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>Registro no histórico de vendas</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      <span>Alertas para falta de estoque</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      <span>Alertas para mapeamento pendente</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      <span>Alertas para produtos inativos</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span>Notificações via Telegram</span>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-center">
                  <Button 
                    onClick={() => setConfirmacao(true)}
                    className="flex items-center gap-2"
                    size="lg"
                  >
                    <Play className="h-5 w-5" />
                    Iniciar Processamento Automático
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {confirmacao && !loading && !resultado && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">⚠️ Confirmar Processamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Tem certeza que deseja executar o processamento automático completo? 
                  Esta ação irá:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Processar TODOS os pedidos pendentes automaticamente</li>
                  <li>Fazer baixa no estoque de produtos disponíveis</li>
                  <li>Enviar alertas via Telegram para problemas encontrados</li>
                  <li>Registrar todas as movimentações no histórico</li>
                </ul>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setConfirmacao(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleExecutar}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Sim, Executar Processamento
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-spin mx-auto mb-4 h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
                <h3 className="text-lg font-medium mb-2">Processando...</h3>
                <p className="text-muted-foreground">
                  Analisando pedidos, verificando estoque e executando baixas automáticas.
                  Este processo pode levar alguns minutos.
                </p>
              </CardContent>
            </Card>
          )}

          {resultado && (
            <div className="space-y-6">
              {renderResumo()}
              
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Detalhes do Processamento</h3>
                <Button 
                  variant="outline" 
                  onClick={downloadRelatorio}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Baixar Relatório
                </Button>
              </div>
              
              {renderDetalhesErros()}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
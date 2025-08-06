import { ScanLine, Camera, Search, Package, X, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function Scanner() {
  const {
    isScanning,
    isNative,
    loading,
    lastScanResult,
    scannedProduct,
    scanHistory,
    startScan,
    stopScan,
    buscarManualmente,
    limparResultado
  } = useBarcodeScanner();

  const [manualCode, setManualCode] = useState('');
  
  // Debug - vamos ver o que está acontecendo
  console.log('🔍 Scanner Debug:', { 
    isNative, 
    loading, 
    isScanning, 
    buttonDisabled: !isNative || loading 
  });
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Scanner de Código de Barras</h1>
          <p className="text-muted-foreground">Leitura rápida de códigos para consulta de produtos</p>
        </div>
      </div>

      {/* Scanner Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Scanner de Câmera
            </CardTitle>
            <CardDescription>
              Use a câmera do dispositivo para ler códigos de barras
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
              <div className="text-center">
                {isScanning ? (
                  <>
                    <ScanLine className="mx-auto h-12 w-12 text-primary mb-4 animate-pulse" />
                    <p className="text-primary mb-4">Escaneando...</p>
                    <Button variant="destructive" onClick={stopScan}>
                      <X className="mr-2 h-4 w-4" />
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <>
                    <ScanLine className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      {isNative ? "Câmera pronta para usar" : "Scanner disponível apenas em dispositivos móveis"}
                    </p>
                    <Button 
                      variant="premium" 
                      onClick={startScan}
                      disabled={!isNative || loading}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      {loading ? "Carregando..." : "Ativar Câmera"}
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-accent-light rounded-lg">
              <h4 className="font-medium text-foreground mb-2">Como usar:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Posicione o código de barras no centro da tela</li>
                <li>• Mantenha o dispositivo estável</li>
                <li>• Aguarde a leitura automática</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Manual Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Busca Manual
            </CardTitle>
            <CardDescription>
              Digite o código manualmente para buscar o produto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Código de Barras</label>
              <Input 
                placeholder="Digite ou cole o código aqui..."
                className="text-center font-mono"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    buscarManualmente(manualCode);
                  }
                }}
              />
            </div>
            
            <Button 
              className="w-full" 
              variant="secondary"
              onClick={() => buscarManualmente(manualCode)}
              disabled={loading || !manualCode.trim()}
            >
              <Search className="mr-2 h-4 w-4" />
              {loading ? "Buscando..." : "Buscar Produto"}
            </Button>

            {lastScanResult && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-foreground">Último código lido:</h4>
                  <Button variant="ghost" size="sm" onClick={limparResultado}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="font-mono text-foreground bg-muted p-2 rounded">
                  {lastScanResult}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  <Clock className="inline h-3 w-3 mr-1" />
                  Agora mesmo
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Resultado da Busca
          </CardTitle>
          <CardDescription>
            Informações do produto encontrado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="border rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ) : scannedProduct ? (
            <div className="border rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-foreground">{scannedProduct.nome}</h3>
                  <p className="text-muted-foreground">SKU: {scannedProduct.sku_interno}</p>
                  <p className="text-sm text-muted-foreground">Código: {scannedProduct.codigo_barras}</p>
                </div>
                <Badge variant={scannedProduct.status === 'ativo' ? 'default' : 'secondary'}>
                  {scannedProduct.status === 'ativo' ? 'Em Estoque' : scannedProduct.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Quantidade Atual</p>
                  <p className="text-xl font-bold text-foreground">{scannedProduct.quantidade_atual} unidades</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estoque Mínimo</p>
                  <p className="text-xl font-bold text-foreground">{scannedProduct.estoque_minimo} unidades</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Última Movimentação</p>
                  <p className="text-xl font-bold text-foreground">
                    {scannedProduct.ultima_movimentacao 
                      ? formatDistanceToNow(new Date(scannedProduct.ultima_movimentacao), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })
                      : 'Nunca'
                    }
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="secondary">Ver Detalhes</Button>
                <Button variant="outline">Movimentar Estoque</Button>
                <Button variant="outline">Histórico</Button>
              </div>
            </div>
          ) : lastScanResult ? (
            <div className="border rounded-lg p-6 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Produto não encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Código {lastScanResult} não foi encontrado no sistema
              </p>
              <Button variant="outline" onClick={limparResultado}>
                Tentar novamente
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg p-6 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {isNative ? "Escaneie ou digite um código para ver os detalhes do produto" : "Digite um código para buscar o produto"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Scans */}
      <Card>
        <CardHeader>
          <CardTitle>Códigos Lidos Recentemente</CardTitle>
          <CardDescription>
            Histórico dos últimos códigos escaneados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {scanHistory.length > 0 ? (
              scanHistory.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-mono text-sm text-foreground">{item.codigo}</p>
                    <p className={`text-sm ${item.found ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {item.produto}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.timestamp), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </p>
                    <Badge 
                      variant={item.found ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {item.found ? "Encontrado" : "Não encontrado"}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <ScanLine className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Nenhum código escaneado ainda</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
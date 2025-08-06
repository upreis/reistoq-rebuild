import { ScanLine, Camera, Search, Package, X, Clock, Video, VideoOff, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWebBarcodeScanner } from "@/hooks/useWebBarcodeScanner";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function Scanner() {
  const {
    isScanning,
    isSupported,
    hasPermission,
    loading,
    lastScanResult,
    scannedProduct,
    scanHistory,
    availableCameras,
    selectedCamera,
    videoRef,
    setSelectedCamera,
    startScan,
    stopScan,
    buscarManualmente,
    limparResultado
  } = useWebBarcodeScanner();

  const [manualCode, setManualCode] = useState('');
  
  // Debug - vamos ver o que está acontecendo
  console.log('🔍 Scanner Web Debug:', { 
    isSupported, 
    hasPermission,
    loading, 
    isScanning, 
    availableCameras: availableCameras.length 
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
          <CardContent className="space-y-4">
            {!isSupported && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <p className="font-medium">Navegador não suportado</p>
                </div>
                <p className="text-sm text-destructive/80 mt-1">
                  Seu navegador não suporta acesso à câmera. Use um navegador moderno como Chrome, Firefox ou Safari.
                </p>
              </div>
            )}

            {isSupported && availableCameras.length > 1 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Selecionar Câmera</label>
                <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma câmera" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCameras.map((camera) => (
                      <SelectItem key={camera.deviceId} value={camera.deviceId}>
                        {camera.label || `Câmera ${camera.deviceId.slice(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="aspect-video bg-muted rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/30 relative">
              {isSupported ? (
                <>
                  <video 
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                    muted
                    style={{ display: isScanning ? 'block' : 'none' }}
                  />
                  
                  {!isScanning && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Camera className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">
                          {hasPermission === false 
                            ? "Permissão de câmera necessária" 
                            : "Toque para ativar a câmera"
                          }
                        </p>
                        <Button 
                          variant="default" 
                          onClick={startScan}
                          disabled={loading || hasPermission === false}
                        >
                          <Video className="mr-2 h-4 w-4" />
                          {loading ? "Carregando..." : "Ativar Scanner"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {isScanning && (
                    <div className="absolute inset-0">
                      {/* Overlay de scanning */}
                      <div className="absolute inset-0 bg-black/20">
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <div className="w-48 h-48 border-2 border-primary rounded-lg relative">
                            <div className="absolute top-0 left-0 w-6 h-6 border-l-4 border-t-4 border-primary"></div>
                            <div className="absolute top-0 right-0 w-6 h-6 border-r-4 border-t-4 border-primary"></div>
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-l-4 border-b-4 border-primary"></div>
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-r-4 border-b-4 border-primary"></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Botão de parar */}
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                        <Button variant="destructive" onClick={stopScan}>
                          <VideoOff className="mr-2 h-4 w-4" />
                          Parar Scanner
                        </Button>
                      </div>
                      
                      {/* Indicador de escaneamento */}
                      <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                        <div className="bg-primary/90 text-primary-foreground px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                          <ScanLine className="h-4 w-4 animate-pulse" />
                          Escaneando...
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Scanner não disponível</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-4 p-4 bg-accent/10 rounded-lg">
              <h4 className="font-medium text-foreground mb-2">Como usar:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Posicione o código de barras no centro da área destacada</li>
                <li>• Mantenha o dispositivo estável e bem iluminado</li>
                <li>• A leitura é automática quando o código for detectado</li>
                <li>• Funciona em qualquer navegador moderno</li>
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
                {isSupported ? "Escaneie ou digite um código para ver os detalhes do produto" : "Digite um código para buscar o produto"}
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
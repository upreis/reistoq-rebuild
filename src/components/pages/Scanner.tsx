import { ScanLine, Camera, Search, Package, X, Clock, Video, VideoOff, AlertCircle, Upload, Maximize2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWebBarcodeScanner } from "@/hooks/useWebBarcodeScanner";
import { ProdutoScannerModal } from "@/components/scanner/ProdutoScannerModal";
import { MovimentacaoRapida } from "@/components/scanner/MovimentacaoRapida";
import { ScannerStats } from "@/components/scanner/ScannerStats";
import { ScannerHistory } from "@/components/scanner/ScannerHistory";
import { ScannerModeToggle } from "@/components/scanner/ScannerModeToggle";
import { useState, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

export function Scanner() {
  const {
    isScanning,
    isSupported,
    hasPermission,
    loading,
    isSearching,
    lastScanResult,
    scannedProduct,
    scanHistory,
    searchResults,
    availableCameras,
    selectedCamera,
    videoRef,
    showProdutoModal,
    codigoParaModal,
    continuousMode,
    soundEnabled,
    vibrationEnabled,
    setSelectedCamera,
    setShowProdutoModal,
    setContinuousMode,
    setSoundEnabled,
    setVibrationEnabled,
    startScan,
    stopScan,
    buscarManualmente,
    buscarComDebounce,
    scanFromImage,
    selecionarProduto,
    limparResultado,
    onProdutoSalvo,
    buscarProdutoMultiplo
  } = useWebBarcodeScanner();

  const [manualCode, setManualCode] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Função para recarregar dados do produto após movimentação
  const recarregarProduto = async () => {
    if (scannedProduct) {
      const produtosAtualizados = await buscarProdutoMultiplo(scannedProduct.sku_interno);
      if (produtosAtualizados.length > 0) {
        selecionarProduto(produtosAtualizados[0]);
      }
    }
  };

  // Função para upload de imagem
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const codigo = await scanFromImage(file);
      if (codigo) {
        toast({
          title: "Código detectado!",
          description: `Código ${codigo} encontrado na imagem`,
        });
      } else {
        toast({
          title: "Nenhum código encontrado",
          description: "Não foi possível detectar um código de barras na imagem",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao processar imagem",
        description: "Ocorreu um erro ao escanear a imagem",
        variant: "destructive"
      });
    }
    
    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Toggle fullscreen para mobile
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 id="scanner-title" className="text-3xl font-bold text-foreground">Scanner de Código de Barras</h1>
          <p className="text-muted-foreground">Leitura rápida de códigos para consulta de produtos</p>
        </div>
      </div>

      {/* Layout responsivo reorganizado */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Camera Scanner - order-1 md:order-1 md:col-span-8 */}
        <Card 
          id="camera-scanner" 
          className="order-1 md:order-1 md:col-span-8 min-h-[280px] md:min-h-0"
          aria-labelledby="camera-scanner-title"
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                <CardTitle id="camera-scanner-title">Scanner de Câmera</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={toggleFullscreen}
                  className="lg:hidden"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>
            <CardDescription>
              Use a câmera ou faça upload de uma imagem para ler códigos de barras
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

        {/* Busca Inteligente - order-3 md:order-1 md:col-span-4 */}
        <Card className="order-3 md:order-1 md:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Busca Inteligente
            </CardTitle>
            <CardDescription>
              Busca instantânea por SKU, nome ou código de barras
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Buscar Produto</label>
              <p className="text-xs text-muted-foreground">
                Digite para buscar automaticamente (mín. 2 caracteres)
              </p>
              <Input 
                placeholder="Ex: SKU-001, Produto XYZ ou 789012345..."
                value={manualCode}
                onChange={(e) => {
                  setManualCode(e.target.value);
                  buscarComDebounce(e.target.value);
                }}
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
              disabled={isSearching || !manualCode.trim()}
            >
              <Search className="mr-2 h-4 w-4" />
              {isSearching ? "Buscando..." : "Buscar Agora"}
            </Button>

            {/* Resultados da busca múltipla */}
            {searchResults.length > 1 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Produtos encontrados:</h4>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {searchResults.map((produto, index) => (
                    <div 
                      key={produto.id}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => selecionarProduto(produto)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{produto.nome}</p>
                          <p className="text-xs text-muted-foreground">SKU: {produto.sku_interno}</p>
                          {produto.codigo_barras && (
                            <p className="text-xs text-muted-foreground">Código: {produto.codigo_barras}</p>
                          )}
                        </div>
                        <Badge variant={produto.quantidade_atual <= produto.estoque_minimo ? 'destructive' : 'default'}>
                          {produto.quantidade_atual} un.
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

        {/* Estatísticas - order-2 md:order-2 md:col-span-12 */}
        <div className="order-2 md:order-2 md:col-span-12">
          <ScannerStats scanHistory={scanHistory.map(h => ({ ...h, timestamp: new Date(h.timestamp) }))} />
        </div>
      </div>

      {/* Configurações do Scanner */}
      <ScannerModeToggle
        continuousMode={continuousMode}
        onContinuousModeChange={setContinuousMode}
        soundEnabled={soundEnabled}
        onSoundEnabledChange={setSoundEnabled}
        vibrationEnabled={vibrationEnabled}
        onVibrationEnabledChange={setVibrationEnabled}
      />

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
            <div className="space-y-6">
              {/* Informações do Produto */}
              <div className="border rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    {scannedProduct.url_imagem && (
                      <img 
                        src={scannedProduct.url_imagem} 
                        alt={scannedProduct.nome}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div>
                      <h3 className="text-lg font-medium text-foreground">{scannedProduct.nome}</h3>
                      <p className="text-muted-foreground">SKU: {scannedProduct.sku_interno}</p>
                      {scannedProduct.codigo_barras && (
                        <p className="text-sm text-muted-foreground">Código: {scannedProduct.codigo_barras}</p>
                      )}
                    </div>
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
                  <Button 
                    variant="secondary"
                    onClick={() => {
                      setShowProdutoModal(true);
                    }}
                  >
                    Ver/Editar Detalhes
                  </Button>
                  <Button variant="outline" onClick={limparResultado}>
                    Limpar Resultado
                  </Button>
                </div>
              </div>

              {/* Movimentação Rápida */}
              <MovimentacaoRapida 
                produto={scannedProduct}
                onMovimentacao={recarregarProduto}
              />
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

      {/* Histórico com filtros avançados */}
      <ScannerHistory scanHistory={scanHistory.map(h => ({ ...h, timestamp: new Date(h.timestamp) }))} />

      {/* Modal para criar/editar produto */}
      <ProdutoScannerModal 
        isOpen={showProdutoModal}
        onClose={() => setShowProdutoModal(false)}
        onSuccess={onProdutoSalvo}
        codigoEscaneado={codigoParaModal}
        produtoEncontrado={scannedProduct}
      />
    </div>
  );
}
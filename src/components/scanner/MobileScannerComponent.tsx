import React, { useEffect, useState } from 'react';
import { Camera, FlashlightIcon, SwitchCamera, X, AlertCircle, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMobileBarcodeScanner } from '@/hooks/useMobileBarcodeScanner';
import { cn } from '@/lib/utils';

interface MobileScannerProps {
  onScanResult?: (code: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function MobileScannerComponent({ 
  onScanResult, 
  onError, 
  className 
}: MobileScannerProps) {
  const {
    isScanning,
    hasPermission,
    cameras,
    selectedCameraId,
    torchEnabled,
    capabilities,
    loading,
    error,
    isMobile,
    isIOS,
    isAndroid,
    videoRef,
    getMobileEnvironmentInfo,
    checkPermission,
    startCamera,
    stopCamera,
    toggleTorch,
    switchCamera,
    startScanning,
    stopScanning,
    setOnScanResult,
    isSupported
  } = useMobileBarcodeScanner();

  const [userGestureRequired, setUserGestureRequired] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Configurar callback de resultado
  useEffect(() => {
    setOnScanResult(() => onScanResult);
  }, [onScanResult, setOnScanResult]);

  // Propagar erros
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Verificar ambiente mobile na inicialização
  useEffect(() => {
    if (isMobile) {
      getMobileEnvironmentInfo();
    }
  }, [isMobile, getMobileEnvironmentInfo]);

  // Handler para iniciar câmera com gesto do usuário
  const handleStartWithGesture = async () => {
    setUserGestureRequired(false);
    
    const hasPerms = await checkPermission();
    if (hasPerms) {
      const cameraStarted = await startCamera();
      if (cameraStarted) {
        startScanning();
      }
    }
  };

  // Handler para parar tudo
  const handleStop = async () => {
    stopScanning();
    await stopCamera();
  };

  // Handler para alternar lanterna
  const handleTorchToggle = async () => {
    const success = await toggleTorch();
    if (!success && capabilities?.torch === false) {
      onError?.('Lanterna não suportada neste dispositivo');
    }
  };

  // Renderizar diagnósticos
  const renderDiagnostics = () => (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm">🔧 Diagnósticos Mobile</CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div>
          <strong>Dispositivo:</strong> {isIOS ? 'iOS' : isAndroid ? 'Android' : 'Desktop'}
        </div>
        <div>
          <strong>User Agent:</strong> 
          <code className="text-xs bg-muted p-1 rounded block mt-1 break-all">
            {navigator.userAgent}
          </code>
        </div>
        <div>
          <strong>HTTPS:</strong> {location.protocol === 'https:' ? '✅' : '❌'}
        </div>
        <div>
          <strong>PWA:</strong> {window.matchMedia('(display-mode: standalone)').matches ? '✅' : '❌'}
        </div>
        <div>
          <strong>Câmeras:</strong> {cameras.length}
        </div>
        <div>
          <strong>Torch Support:</strong> {capabilities?.torch ? '✅' : '❌'}
        </div>
        <div>
          <strong>Viewport:</strong> {window.innerWidth}x{window.innerHeight} 
          (DPR: {window.devicePixelRatio})
        </div>
      </CardContent>
    </Card>
  );

  if (!isSupported) {
    return (
      <Card className={cn("border-destructive", className)}>
        <CardContent className="p-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold text-destructive mb-2">
            Scanner não suportado
          </h3>
          <p className="text-muted-foreground mb-4">
            Este navegador não suporta acesso à câmera. 
            Use Chrome, Safari ou Firefox atualizados.
          </p>
          <Button variant="outline" onClick={() => setShowDiagnostics(!showDiagnostics)}>
            Ver Diagnósticos
          </Button>
          {showDiagnostics && renderDiagnostics()}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scanner Mobile
            {isMobile && (
              <Badge variant="secondary" className="text-xs">
                {isIOS ? 'iOS' : isAndroid ? 'Android' : 'Mobile'}
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex gap-2">
            {/* Diagnostics Toggle */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowDiagnostics(!showDiagnostics)}
            >
              🔧
            </Button>
            
            {/* Camera Selector */}
            {cameras.length > 1 && (
              <Select value={selectedCameraId} onValueChange={switchCamera}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map((camera) => (
                    <SelectItem key={camera.deviceId} value={camera.deviceId}>
                      {camera.isBack ? '📷 Traseira' : '🤳 Frontal'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Área do vídeo */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className={cn(
              "w-full h-full object-cover",
              // Estilos críticos para iOS
              "touch-none",
              "[&::-webkit-media-controls]:hidden",
              "focus:outline-none"
            )}
            playsInline
            muted
            autoPlay
            disablePictureInPicture
            controls={false}
            style={{
              objectFit: 'cover',
              transform: 'none',
              touchAction: 'none'
            }}
          />
          
          {/* Overlay de escaneamento */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Máscara escura */}
              <div className="absolute inset-0 bg-black/30" />
              
              {/* Área de scan */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-48 h-48 border-2 border-primary rounded-lg relative">
                  {/* Cantos do scanner */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-l-4 border-t-4 border-primary" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-r-4 border-t-4 border-primary" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-l-4 border-b-4 border-primary" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-r-4 border-b-4 border-primary" />
                  
                  {/* Linha de scan animada */}
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-primary animate-pulse" 
                       style={{ 
                         animation: 'scan-line 2s ease-in-out infinite',
                         background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)'
                       }} />
                </div>
              </div>
              
              {/* Status */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary/90 text-primary-foreground">
                  📡 Escaneando...
                </Badge>
              </div>
            </div>
          )}
          
          {/* Estado não escaneando */}
          {!isScanning && !loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center text-white">
                <Camera className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p className="text-sm mb-4">
                  {hasPermission === false 
                    ? "Permissão de câmera necessária"
                    : userGestureRequired 
                    ? "Toque para iniciar"
                    : "Pronto para escanear"
                  }
                </p>
                
                {/* Botão para iOS que requer gesto do usuário */}
                {(hasPermission !== false && !isScanning) && (
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={handleStartWithGesture}
                    disabled={loading}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {loading ? 'Iniciando...' : 'Iniciar Scanner'}
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2" />
                <p className="text-sm">Carregando câmera...</p>
              </div>
            </div>
          )}
        </div>

        {/* Controles */}
        <div className="flex justify-center gap-3">
          {!isScanning ? (
            <Button 
              onClick={handleStartWithGesture}
              disabled={loading || hasPermission === false}
              className="flex-1 max-w-48"
            >
              <Camera className="w-4 h-4 mr-2" />
              {loading ? 'Carregando...' : 'Iniciar'}
            </Button>
          ) : (
            <Button 
              variant="destructive" 
              onClick={handleStop}
              className="flex-1 max-w-48"
            >
              <X className="w-4 h-4 mr-2" />
              Parar
            </Button>
          )}
          
          {/* Torch (apenas se suportado) */}
          {capabilities?.torch && (
            <Button 
              variant={torchEnabled ? "default" : "outline"}
              size="icon"
              onClick={handleTorchToggle}
              disabled={!isScanning}
            >
              <FlashlightIcon className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Erro */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="text-sm text-destructive">
                <p className="font-medium">Erro:</p>
                <p>{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Instruções específicas para mobile */}
        {isMobile && (
          <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/50 rounded">
            <p><strong>📱 Dicas para mobile:</strong></p>
            <ul className="space-y-1 ml-4">
              <li>• Mantenha o dispositivo estável</li>
              <li>• Use boa iluminação</li>
              <li>• Posicione o código no centro</li>
              {isIOS && <li>• No iOS: toque na tela se o vídeo não iniciar</li>}
              {capabilities?.torch && <li>• Use a lanterna em ambientes escuros</li>}
            </ul>
          </div>
        )}

        {/* Diagnósticos (se habilitado) */}
        {showDiagnostics && renderDiagnostics()}
      </CardContent>

      {/* CSS para animação de scan */}
      <style>{`
        @keyframes scan-line {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
      `}</style>
    </Card>
  );
}
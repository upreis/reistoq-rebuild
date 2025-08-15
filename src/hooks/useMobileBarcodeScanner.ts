import { useState, useRef, useCallback, useEffect } from 'react';
import { BrowserMultiFormatReader, DecodeHintType } from '@zxing/library';

interface MobileScannerConstraints {
  video: {
    facingMode?: { ideal: string } | { exact: string };
    deviceId?: { exact: string };
    width: { ideal: number };
    height: { ideal: number };
    frameRate: { ideal: number };
    focusMode?: { ideal: string };
    torch?: boolean;
  };
  audio: false;
}

interface CameraDevice {
  deviceId: string;
  label: string;
  isFront: boolean;
  isBack: boolean;
}

interface ScannerCapabilities {
  torch: boolean;
  zoom: boolean;
  focusMode: string[];
}

export function useMobileBarcodeScanner() {
  // Estados principais
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [capabilities, setCapabilities] = useState<ScannerCapabilities | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  // Detectar se é mobile
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  // 1) DIAGNÓSTICO DO AMBIENTE MOBILE
  const getMobileEnvironmentInfo = useCallback(async () => {
    const info = {
      userAgent: navigator.userAgent,
      isMobile,
      isIOS,
      isAndroid,
      supportedConstraints: navigator.mediaDevices.getSupportedConstraints(),
      permissions: null as any,
      devices: [] as MediaDeviceInfo[],
      https: location.protocol === 'https:',
      pwa: window.matchMedia('(display-mode: standalone)').matches,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      }
    };

    // Testar permissões
    try {
      info.permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
    } catch (e) {
      info.permissions = { state: 'unknown', error: e };
    }

    // Listar dispositivos após permissão
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      info.devices = await navigator.mediaDevices.enumerateDevices();
    } catch (e) {
      console.warn('Cannot enumerate devices without permission');
    }

    console.log('📱 MOBILE SCANNER DIAGNOSIS:', info);
    return info;
  }, [isMobile, isIOS, isAndroid]);

  // 2) INICIALIZAÇÃO DO ZXING PARA MOBILE
  const initializeScanner = useCallback(() => {
    if (!codeReaderRef.current) {
      codeReaderRef.current = new BrowserMultiFormatReader();
      
      // Hints otimizados para mobile
      const hints = new Map();
      hints.set(DecodeHintType.TRY_HARDER, true);
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        'CODE_128', 'CODE_39', 'EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'QR_CODE'
      ]);
      
      codeReaderRef.current.hints = hints;
    }
  }, []);

  // 3) VERIFICAÇÃO DE PERMISSÕES ROBUSTA
  const checkPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('getUserMedia não suportado neste navegador');
      return false;
    }

    try {
      setLoading(true);
      
      // Primeiro tentar obter permissão básica
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      });
      
      // Parar imediatamente após obter permissão
      stream.getTracks().forEach(track => track.stop());
      
      setHasPermission(true);
      setError(null);
      
      // Agora enumerar dispositivos com labels
      await getDevices();
      
      return true;
    } catch (err: any) {
      const errorMessage = getPermissionErrorMessage(err);
      setError(errorMessage);
      setHasPermission(false);
      console.error('Permission check failed:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // 4) OBTER DISPOSITIVOS COM DETECÇÃO FRONT/BACK
  const getDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      const cameraDevices: CameraDevice[] = videoDevices.map(device => ({
        deviceId: device.deviceId,
        label: device.label || `Câmera ${device.deviceId.slice(0, 8)}`,
        isFront: /front|user|selfie/i.test(device.label),
        isBack: /back|rear|environment|camera 0/i.test(device.label) || 
                (!device.label.match(/front|user|selfie/i) && device.deviceId !== videoDevices[0]?.deviceId)
      }));

      setCameras(cameraDevices);
      
      // Selecionar câmera traseira por padrão
      const backCamera = cameraDevices.find(cam => cam.isBack);
      const defaultCamera = backCamera || cameraDevices[0];
      
      if (defaultCamera && !selectedCameraId) {
        setSelectedCameraId(defaultCamera.deviceId);
      }
      
      return cameraDevices;
    } catch (err) {
      console.error('Error getting devices:', err);
      return [];
    }
  }, [selectedCameraId]);

  // 5) CONSTRAINTS OTIMIZADAS PARA MOBILE
  const getMobileConstraints = useCallback((deviceId?: string): MobileScannerConstraints => {
    const baseConstraints: MobileScannerConstraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      },
      audio: false
    };

    if (deviceId) {
      baseConstraints.video.deviceId = { exact: deviceId };
    } else {
      baseConstraints.video.facingMode = { ideal: 'environment' };
    }

    // Otimizações específicas para mobile
    if (isMobile) {
      // iOS precisa de configurações específicas
      if (isIOS) {
        baseConstraints.video.width = { ideal: 1920 };
        baseConstraints.video.height = { ideal: 1080 };
        baseConstraints.video.frameRate = { ideal: 24 }; // iOS prefere 24fps
      }
      
      // Android pode usar higher resolution
      if (isAndroid) {
        baseConstraints.video.width = { ideal: 1920 };
        baseConstraints.video.height = { ideal: 1080 };
        baseConstraints.video.frameRate = { ideal: 30 };
      }
    }

    return baseConstraints;
  }, [isMobile, isIOS, isAndroid]);

  // 6) INICIAR CÂMERA COM FALLBACKS
  const startCamera = useCallback(async (deviceId?: string): Promise<boolean> => {
    if (!videoRef.current) {
      setError('Elemento de vídeo não encontrado');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      // Parar stream anterior se existir
      await stopCamera();

      // Tentar com deviceId específico primeiro
      let constraints = getMobileConstraints(deviceId || selectedCameraId);
      let stream: MediaStream;

      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err: any) {
        // Fallback 1: Tentar sem deviceId específico
        if (err.name === 'OverconstrainedError' && deviceId) {
          console.warn('Device constraint failed, trying facingMode fallback');
          constraints = getMobileConstraints();
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } else {
          throw err;
        }
      }

      // Configurar vídeo para mobile
      const video = videoRef.current;
      video.srcObject = stream;
      
      // CRÍTICO para iOS: evitar fullscreen
      video.playsInline = true;
      video.muted = true;
      video.autoplay = true;
      video.controls = false;
      video.disablePictureInPicture = true;
      
      // CSS para evitar zoom/gestures no iOS
      video.style.objectFit = 'cover';
      video.style.transform = 'none';
      video.style.touchAction = 'none';

      // Aguardar o vídeo carregar
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = reject;
        
        // Timeout de segurança
        setTimeout(() => reject(new Error('Video load timeout')), 5000);
      });

      // Para iOS: aguardar gesto do usuário para play
      try {
        await video.play();
      } catch (playError: any) {
        if (playError.name === 'NotAllowedError') {
          setError('Toque na tela para iniciar a câmera (requerido pelo iOS)');
          // Aguardar clique do usuário
          const playOnClick = async () => {
            try {
              await video.play();
              document.removeEventListener('click', playOnClick);
              setError(null);
            } catch (e) {
              console.error('Failed to play on user gesture:', e);
            }
          };
          document.addEventListener('click', playOnClick);
        } else {
          throw playError;
        }
      }

      // Salvar referências
      streamRef.current = stream;
      const videoTrack = stream.getVideoTracks()[0];
      trackRef.current = videoTrack;

      // Verificar capacidades (torch, zoom, etc)
      const caps = videoTrack.getCapabilities() as any;
      setCapabilities({
        torch: 'torch' in caps,
        zoom: 'zoom' in caps,
        focusMode: caps.focusMode || []
      });

      // Aplicar foco contínuo se suportado
      if (caps.focusMode && caps.focusMode.includes('continuous')) {
        try {
          await videoTrack.applyConstraints({
            advanced: [{ focusMode: 'continuous' } as any]
          });
        } catch (e) {
          console.warn('Could not set continuous focus:', e);
        }
      }

      setLoading(false);
      return true;

    } catch (err: any) {
      const errorMessage = getCameraErrorMessage(err);
      setError(errorMessage);
      setLoading(false);
      console.error('Start camera failed:', err);
      return false;
    }
  }, [selectedCameraId, getMobileConstraints]);

  // 7) PARAR CÂMERA COMPLETAMENTE
  const stopCamera = useCallback(async () => {
    setIsScanning(false);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    if (trackRef.current) {
      trackRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setTorchEnabled(false);
  }, []);

  // 8) CONTROLE DO TORCH (LANTERNA)
  const toggleTorch = useCallback(async () => {
    if (!trackRef.current || !capabilities?.torch) {
      return false;
    }

    try {
      const newTorchState = !torchEnabled;
      await trackRef.current.applyConstraints({
        advanced: [{ torch: newTorchState } as any]
      });
      setTorchEnabled(newTorchState);
      return true;
    } catch (err) {
      console.error('Torch toggle failed:', err);
      return false;
    }
  }, [torchEnabled, capabilities]);

  // 9) TROCAR CÂMERA
  const switchCamera = useCallback(async (deviceId: string) => {
    setSelectedCameraId(deviceId);
    
    if (isScanning) {
      await stopCamera();
      const success = await startCamera(deviceId);
      if (success) {
        startScanning();
      }
    }
  }, [isScanning]);

  // 10) INICIAR SCAN CONTÍNUO
  const startScanning = useCallback(() => {
    if (!codeReaderRef.current || !videoRef.current) {
      return;
    }

    setIsScanning(true);
    
    // Iniciar decodificação contínua
    codeReaderRef.current.decodeFromVideoDevice(
      selectedCameraId || undefined,
      videoRef.current,
      (result, error) => {
        if (result) {
          const code = result.getText();
          onScanResult?.(code);
          
          // Feedback háptico para mobile
          if (navigator.vibrate) {
            navigator.vibrate([100]);
          }
        }
        
        if (error && error.name !== 'NotFoundException') {
          console.warn('Scan error:', error);
        }
      }
    );
  }, [selectedCameraId]);

  // 11) PARAR SCANNING
  const stopScanning = useCallback(() => {
    setIsScanning(false);
    
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
  }, []);

  // 12) HANDLERS PARA VISIBILIDADE E ORIENTAÇÃO
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isScanning) {
        stopCamera();
      }
    };

    const handlePageHide = () => {
      if (isScanning) {
        stopCamera();
      }
    };

    const handleOrientationChange = () => {
      // Pequeno delay para aguardar a mudança completar
      setTimeout(() => {
        if (isScanning && videoRef.current) {
          // Reconfigurar vídeo após rotação
          const video = videoRef.current;
          video.style.objectFit = 'cover';
        }
      }, 100);
    };

    const handleResize = () => {
      if (isMobile && isScanning) {
        handleOrientationChange();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleResize);
    };
  }, [isScanning, isMobile]);

  // 13) INICIALIZAÇÃO
  useEffect(() => {
    initializeScanner();
    getMobileEnvironmentInfo();
    
    return () => {
      stopCamera();
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, []);

  // Callback para resultado do scan (será definido externamente)
  const [onScanResult, setOnScanResult] = useState<((code: string) => void) | null>(null);

  return {
    // Estados
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
    
    // Refs
    videoRef,
    
    // Funções
    getMobileEnvironmentInfo,
    checkPermission,
    startCamera,
    stopCamera,
    toggleTorch,
    switchCamera,
    startScanning,
    stopScanning,
    setOnScanResult,
    
    // Informações
    isSupported: !!navigator.mediaDevices?.getUserMedia
  };
}

// UTILIDADES PARA TRATAMENTO DE ERROS
function getPermissionErrorMessage(error: any): string {
  switch (error.name) {
    case 'NotAllowedError':
      return 'Permissão de câmera negada. Permita o acesso nas configurações do navegador.';
    case 'NotFoundError':
      return 'Nenhuma câmera encontrada no dispositivo.';
    case 'NotReadableError':
      return 'Câmera está sendo usada por outro aplicativo.';
    case 'OverconstrainedError':
      return 'Configurações de câmera não suportadas.';
    case 'SecurityError':
      return 'Acesso à câmera bloqueado por segurança. Use HTTPS.';
    case 'AbortError':
      return 'Operação cancelada pelo usuário.';
    default:
      return `Erro de câmera: ${error.message || 'Desconhecido'}`;
  }
}

function getCameraErrorMessage(error: any): string {
  switch (error.name) {
    case 'NotAllowedError':
      return 'Acesso à câmera negado. Toque para tentar novamente.';
    case 'NotFoundError':
      return 'Câmera não encontrada ou não disponível.';
    case 'NotReadableError':
      return 'Câmera ocupada. Feche outros apps que usam a câmera.';
    case 'OverconstrainedError':
      return 'Configurações incompatíveis. Tentando configuração alternativa...';
    case 'SecurityError':
      return 'Erro de segurança. Verifique se está usando HTTPS.';
    default:
      return `Erro: ${error.message || 'Falha ao inicializar câmera'}`;
  }
}
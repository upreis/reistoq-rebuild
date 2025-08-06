import { useState, useRef, useCallback, useEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { pipeline } from '@huggingface/transformers';

interface ScannedProduct {
  id: string;
  nome: string;
  sku_interno: string;
  codigo_barras: string;
  quantidade_atual: number;
  estoque_minimo: number;
  status: string;
  categoria?: string;
  preco_venda?: number;
  ultima_movimentacao?: string;
  url_imagem?: string;
}

interface ScanHistory {
  codigo: string;
  produto?: string;
  timestamp: string;
  found: boolean;
}

export function useWebBarcodeScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [lastScanResult, setLastScanResult] = useState<string>('');
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [showProdutoModal, setShowProdutoModal] = useState(false);
  const [codigoParaModal, setCodigoParaModal] = useState<string>('');
  const [searchResults, setSearchResults] = useState<ScannedProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Novas configurações
  const [continuousMode, setContinuousMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [productCache, setProductCache] = useState<Map<string, ScannedProduct>>(new Map());
  
  // Referência para busca com debounce
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const { toast } = useToast();

  // Verificar se o navegador suporta getUserMedia
  const isSupported = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;

  // Inicializar o leitor de código
  useEffect(() => {
    if (isSupported) {
      codeReaderRef.current = new BrowserMultiFormatReader();
    }
    
    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, [isSupported]);

  // Obter câmeras disponíveis
  const getCameras = useCallback(async () => {
    if (!isSupported) return;

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(cameras);
      
      // Preferir câmera traseira se disponível
      const backCamera = cameras.find(camera => 
        camera.label.toLowerCase().includes('back') || 
        camera.label.toLowerCase().includes('rear') ||
        camera.label.toLowerCase().includes('environment')
      );
      
      setSelectedCamera(backCamera?.deviceId || cameras[0]?.deviceId || '');
    } catch (error) {
      console.error('Erro ao obter câmeras:', error);
    }
  }, [isSupported]);

  // Verificar permissões
  const checkPermissions = async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: "Scanner não suportado",
        description: "Seu navegador não suporta acesso à câmera",
        variant: "destructive"
      });
      return false;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      
      if (permission.state === 'granted') {
        setHasPermission(true);
        await getCameras();
        return true;
      } else if (permission.state === 'denied') {
        setHasPermission(false);
        toast({
          title: "Permissão negada",
          description: "É necessário permitir o acesso à câmera para usar o scanner",
          variant: "destructive"
        });
        return false;
      } else {
        // Tentar solicitar permissão
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop());
          setHasPermission(true);
          await getCameras();
          return true;
        } catch (error) {
          setHasPermission(false);
          toast({
            title: "Permissão negada",
            description: "É necessário permitir o acesso à câmera para usar o scanner",
            variant: "destructive"
          });
          return false;
        }
      }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      setHasPermission(false);
      return false;
    }
  };

  // Feedback sonoro/vibração
  const playFeedback = useCallback((success: boolean = true) => {
    if (soundEnabled) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = success ? 800 : 400;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.3);
    }
    
    if (vibrationEnabled && navigator.vibrate) {
      navigator.vibrate(success ? [100] : [100, 50, 100]);
    }
  }, [soundEnabled, vibrationEnabled]);

  // Buscar produto no banco de dados com cache
  const buscarProduto = async (codigo: string): Promise<ScannedProduct | null> => {
    // Verificar cache primeiro
    if (productCache.has(codigo)) {
      return productCache.get(codigo)!;
    }

    try {
      const { data, error } = await supabase
        .from('produtos')
        .select(`
          id,
          nome,
          sku_interno,
          codigo_barras,
          quantidade_atual,
          estoque_minimo,
          status,
          categoria,
          preco_venda,
          ultima_movimentacao,
          url_imagem
        `)
        .eq('codigo_barras', codigo)
        .eq('ativo', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const produto = data as ScannedProduct;
      if (produto) {
        // Adicionar ao cache
        setProductCache(prev => new Map(prev.set(codigo, produto)));
      }

      return produto;
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      return null;
    }
  };

  // Buscar produto por múltiplos campos (SKU, nome, código de barras)
  const buscarProdutoMultiplo = async (termo: string): Promise<ScannedProduct[]> => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select(`
          id,
          nome,
          sku_interno,
          codigo_barras,
          quantidade_atual,
          estoque_minimo,
          status,
          categoria,
          preco_venda,
          ultima_movimentacao,
          url_imagem
        `)
        .eq('ativo', true)
        .or(`sku_interno.ilike.%${termo}%,nome.ilike.%${termo}%,codigo_barras.eq.${termo}`)
        .limit(10);

      if (error) {
        throw error;
      }

      return (data as ScannedProduct[]) || [];
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      return [];
    }
  };

  // Adicionar ao histórico
  const adicionarAoHistorico = (codigo: string, produto?: string, found: boolean = true) => {
    const novoItem: ScanHistory = {
      codigo,
      produto,
      timestamp: new Date().toISOString(),
      found
    };

    setScanHistory(prev => [novoItem, ...prev.slice(0, 9)]);
  };

  // Processar resultado do scan
  const processarScan = async (codigo: string) => {
    setLoading(true);
    
    try {
      const produto = await buscarProduto(codigo);
      
      if (produto) {
        setScannedProduct(produto);
        adicionarAoHistorico(codigo, produto.nome, true);
        playFeedback(true);
        
        toast({
          title: "Produto encontrado!",
          description: `${produto.nome} - ${produto.quantidade_atual} unidades`,
        });
        
        // Abrir modal para edição do produto encontrado
        setCodigoParaModal(codigo);
        setShowProdutoModal(true);
      } else {
        setScannedProduct(null);
        adicionarAoHistorico(codigo, 'Produto não encontrado', false);
        playFeedback(false);
        
        // Abrir modal para criar novo produto
        setCodigoParaModal(codigo);
        setShowProdutoModal(true);
        
        toast({
          title: "Produto não encontrado",
          description: `Código ${codigo} será cadastrado como novo produto`,
          variant: "default"
        });
      }
      
      setLastScanResult(codigo);
    } catch (error) {
      console.error('Erro ao processar scan:', error);
      playFeedback(false);
      toast({
        title: "Erro ao processar código",
        description: "Ocorreu um erro ao buscar o produto",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Callback para quando produto for salvo no modal
  const onProdutoSalvo = (produto: ScannedProduct) => {
    setScannedProduct(produto);
    // Atualizar histórico se era um produto não encontrado
    setScanHistory(prev => 
      prev.map(item => 
        item.codigo === codigoParaModal 
          ? { ...item, produto: produto.nome, found: true }
          : item
      )
    );
  };

  // Iniciar scanner
  const startScan = async () => {
    const hasPermission = await checkPermissions();
    if (!hasPermission || !videoRef.current || !codeReaderRef.current) return;

    try {
      setIsScanning(true);
      
      const constraints = {
        video: selectedCamera ? { deviceId: selectedCamera } : { facingMode: 'environment' }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      await codeReaderRef.current.decodeFromVideoDevice(
        selectedCamera || undefined,
        videoRef.current,
        (result, error) => {
          if (result) {
            const code = result.getText();
            processarScan(code);
            if (!continuousMode) {
              stopScan(); // Para após primeiro scan apenas se não estiver em modo contínuo
            }
          }
        }
      );
      
    } catch (error) {
      console.error('Erro no scanner:', error);
      toast({
        title: "Erro no scanner",
        description: "Não foi possível acessar a câmera",
        variant: "destructive"
      });
      setIsScanning(false);
    }
  };

  // Parar scanner
  const stopScan = useCallback(() => {
    setIsScanning(false);
    
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Busca manual por múltiplos campos
  const buscarManualmente = async (termo: string) => {
    if (!termo.trim()) {
      toast({
        title: "Termo inválido",
        description: "Digite um termo válido para buscar",
        variant: "destructive"
      });
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const produtos = await buscarProdutoMultiplo(termo.trim());
      setSearchResults(produtos);
      
      if (produtos.length === 0) {
        toast({
          title: "Nenhum produto encontrado",
          description: "Tente buscar por SKU, nome ou código de barras",
          variant: "default"
        });
      } else if (produtos.length === 1) {
        // Se encontrou apenas um produto, selecionar automaticamente
        setScannedProduct(produtos[0]);
        setLastScanResult(termo);
        adicionarAoHistorico(termo, produtos[0].nome, true);
      }
    } catch (error) {
      console.error('Erro na busca:', error);
      toast({
        title: "Erro na busca",
        description: "Ocorreu um erro ao buscar produtos",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Busca com debounce
  const buscarComDebounce = useCallback((termo: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (termo.length >= 2) {
        buscarManualmente(termo);
      } else {
        setSearchResults([]);
      }
    }, 300);
  }, []);

  // Scanner por upload de imagem
  const scanFromImage = async (file: File): Promise<string | null> => {
    try {
      setLoading(true);
      
      // Criar elemento de imagem
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Não foi possível criar contexto do canvas');

      return new Promise((resolve, reject) => {
        img.onload = async () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          if (codeReaderRef.current) {
            try {
              const result = await codeReaderRef.current.decodeFromImage(img);
              resolve(result.getText());
            } catch (error) {
              resolve(null);
            }
          } else {
            reject(new Error('Scanner não inicializado'));
          }
        };
        
        img.onerror = () => reject(new Error('Erro ao carregar imagem'));
        img.src = URL.createObjectURL(file);
      });
    } catch (error) {
      console.error('Erro ao escanear imagem:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Limpar resultado
  const limparResultado = useCallback(() => {
    setScannedProduct(null);
    setLastScanResult('');
    setSearchResults([]);
  }, []);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target && (event.target as HTMLElement).tagName === 'INPUT') return;
      
      switch (event.code) {
        case 'Space':
          event.preventDefault();
          if (isScanning) {
            stopScan();
          } else {
            startScan();
          }
          break;
        case 'Escape':
          event.preventDefault();
          limparResultado();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isScanning, stopScan, limparResultado]);

  // Selecionar produto da lista de resultados
  const selecionarProduto = (produto: ScannedProduct) => {
    setScannedProduct(produto);
    setLastScanResult(produto.sku_interno);
    setSearchResults([]);
    adicionarAoHistorico(produto.sku_interno, produto.nome, true);
  };


  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      stopScan();
    };
  }, [stopScan]);

  return {
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
    processarScan,
    onProdutoSalvo,
    buscarProdutoMultiplo
  };
}
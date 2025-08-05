import { useState, useCallback } from 'react';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ScanResult {
  hasContent: boolean;
  content: string;
}

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
}

interface ScanHistory {
  codigo: string;
  produto?: string;
  timestamp: string;
  found: boolean;
}

export function useBarcodeScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<string>('');
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isNative = Capacitor.isNativePlatform();

  // Verificar e solicitar permissões
  const checkPermissions = async (): Promise<boolean> => {
    if (!isNative) {
      toast({
        title: "Scanner não disponível",
        description: "O scanner de código de barras só funciona em dispositivos móveis",
        variant: "destructive"
      });
      return false;
    }

    try {
      const status = await BarcodeScanner.checkPermission({ force: true });
      
      if (status.granted) {
        return true;
      } else if (status.denied) {
        toast({
          title: "Permissão negada",
          description: "É necessário permitir o acesso à câmera para usar o scanner",
          variant: "destructive"
        });
        return false;
      } else {
        // Se não tem permissão, solicitar novamente
        const newStatus = await BarcodeScanner.checkPermission({ force: true });
        return newStatus.granted;
      }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      toast({
        title: "Erro de permissão",
        description: "Não foi possível verificar as permissões da câmera",
        variant: "destructive"
      });
      return false;
    }
  };

  // Buscar produto no banco de dados
  const buscarProduto = async (codigo: string): Promise<ScannedProduct | null> => {
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
          ultima_movimentacao
        `)
        .eq('codigo_barras', codigo)
        .eq('ativo', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data as ScannedProduct;
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      return null;
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

    setScanHistory(prev => [novoItem, ...prev.slice(0, 9)]); // Manter apenas os 10 mais recentes
  };

  // Processar resultado do scan
  const processarScan = async (codigo: string) => {
    setLoading(true);
    
    try {
      const produto = await buscarProduto(codigo);
      
      if (produto) {
        setScannedProduct(produto);
        adicionarAoHistorico(codigo, produto.nome, true);
        
        toast({
          title: "Produto encontrado!",
          description: `${produto.nome} - ${produto.quantidade_atual} unidades`,
        });
      } else {
        setScannedProduct(null);
        adicionarAoHistorico(codigo, 'Produto não encontrado', false);
        
        toast({
          title: "Produto não encontrado",
          description: `Código ${codigo} não foi encontrado no sistema`,
          variant: "destructive"
        });
      }
      
      setLastScanResult(codigo);
    } catch (error) {
      console.error('Erro ao processar scan:', error);
      toast({
        title: "Erro ao processar código",
        description: "Ocorreu um erro ao buscar o produto",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Iniciar scanner
  const startScan = async () => {
    const hasPermission = await checkPermissions();
    if (!hasPermission) return;

    try {
      setIsScanning(true);
      
      // Ocultar o conteúdo da página
      document.body.classList.add('scanner-active');
      await BarcodeScanner.hideBackground();

      const result: ScanResult = await BarcodeScanner.startScan();
      
      if (result.hasContent && result.content) {
        await processarScan(result.content);
      }
    } catch (error) {
      console.error('Erro no scanner:', error);
      toast({
        title: "Erro no scanner",
        description: "Ocorreu um erro ao usar o scanner",
        variant: "destructive"
      });
    } finally {
      await stopScan();
    }
  };

  // Parar scanner
  const stopScan = async () => {
    try {
      setIsScanning(false);
      await BarcodeScanner.showBackground();
      await BarcodeScanner.stopScan();
      document.body.classList.remove('scanner-active');
    } catch (error) {
      console.error('Erro ao parar scanner:', error);
    }
  };

  // Busca manual por código
  const buscarManualmente = async (codigo: string) => {
    if (!codigo.trim()) {
      toast({
        title: "Código inválido",
        description: "Digite um código válido para buscar",
        variant: "destructive"
      });
      return;
    }

    await processarScan(codigo.trim());
  };

  // Limpar resultado
  const limparResultado = useCallback(() => {
    setScannedProduct(null);
    setLastScanResult('');
  }, []);

  return {
    isScanning,
    isNative,
    loading,
    lastScanResult,
    scannedProduct,
    scanHistory,
    startScan,
    stopScan,
    buscarManualmente,
    limparResultado,
    processarScan
  };
}
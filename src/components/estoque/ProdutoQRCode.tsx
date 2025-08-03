import { useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface ProdutoQRCodeProps {
  produto: {
    id: string;
    sku_interno: string;
    nome: string;
    codigo_barras?: string;
  };
  size?: 'sm' | 'md' | 'lg';
}

export function ProdutoQRCode({ produto, size = 'sm' }: ProdutoQRCodeProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [modalAberto, setModalAberto] = useState(false);
  const [gerando, setGerando] = useState(false);
  const { toast } = useToast();

  const gerarQRCode = async () => {
    try {
      setGerando(true);
      
      // Dados para incluir no QR Code
      const dadosProduto = {
        id: produto.id,
        sku: produto.sku_interno,
        nome: produto.nome,
        codigo_barras: produto.codigo_barras,
        url: `${window.location.origin}/estoque?produto=${produto.id}`,
        gerado_em: new Date().toISOString()
      };

      const dadosJson = JSON.stringify(dadosProduto);
      
      const url = await QRCode.toDataURL(dadosJson, {
        width: 512,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      
      setQrCodeUrl(url);
      setModalAberto(true);
      
      toast({
        title: "QR Code gerado",
        description: `QR Code criado para ${produto.nome}`,
      });
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      toast({
        title: "Erro ao gerar QR Code",
        description: "Não foi possível gerar o código QR",
        variant: "destructive",
      });
    } finally {
      setGerando(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.download = `qr-code-${produto.sku_interno}.png`;
    link.href = qrCodeUrl;
    link.click();
    
    toast({
      title: "Download iniciado",
      description: "QR Code salvo com sucesso!",
    });
  };

  const copyToClipboard = async () => {
    try {
      // Converter data URL para blob
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ]);
      
      toast({
        title: "Copiado",
        description: "QR Code copiado para a área de transferência!",
      });
    } catch (error) {
      // Fallback: copiar o texto dos dados
      const dadosProduto = {
        id: produto.id,
        sku: produto.sku_interno,
        nome: produto.nome,
        codigo_barras: produto.codigo_barras,
        url: `${window.location.origin}/estoque?produto=${produto.id}`
      };
      
      navigator.clipboard.writeText(JSON.stringify(dadosProduto, null, 2));
      
      toast({
        title: "Dados copiados",
        description: "Dados do produto copiados como texto!",
      });
    }
  };

  const getButtonSize = () => {
    switch (size) {
      case 'sm':
        return 'sm';
      case 'md':
        return 'default';
      case 'lg':
        return 'lg';
      default:
        return 'sm';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'h-3 w-3';
      case 'md':
        return 'h-4 w-4';
      case 'lg':
        return 'h-5 w-5';
      default:
        return 'h-3 w-3';
    }
  };

  return (
    <>
      <Button
        size={getButtonSize() as any}
        variant="outline"
        onClick={gerarQRCode}
        disabled={gerando}
        className={size === 'sm' ? 'px-2' : ''}
      >
        <QrCode className={`${getIconSize()} ${size !== 'sm' ? 'mr-2' : ''}`} />
        {size !== 'sm' && (gerando ? 'Gerando...' : 'QR Code')}
      </Button>

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code do Produto
            </DialogTitle>
            <DialogDescription>
              {produto.nome} - SKU: {produto.sku_interno}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* QR Code Display */}
            <Card>
              <CardContent className="p-6 flex justify-center">
                {qrCodeUrl ? (
                  <img 
                    src={qrCodeUrl} 
                    alt={`QR Code para ${produto.nome}`}
                    className="w-64 h-64 border rounded-lg"
                  />
                ) : (
                  <div className="w-64 h-64 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center">
                    <QrCode className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Informações incluídas */}
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <p className="font-medium mb-2">Dados incluídos no QR Code:</p>
              <ul className="space-y-1 text-xs">
                <li>• ID do produto: {produto.id}</li>
                <li>• SKU: {produto.sku_interno}</li>
                <li>• Nome: {produto.nome}</li>
                {produto.codigo_barras && <li>• Código de barras: {produto.codigo_barras}</li>}
                <li>• Link direto para o produto</li>
                <li>• Data de geração</li>
              </ul>
            </div>

            {/* Ações */}
            <div className="flex gap-2">
              <Button onClick={downloadQRCode} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button onClick={copyToClipboard} variant="outline" className="flex-1">
                <Eye className="mr-2 h-4 w-4" />
                Copiar
              </Button>
              <Button onClick={() => setModalAberto(false)} variant="outline">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Dicas de uso */}
            <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">💡 Como usar:</p>
              <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                <li>• Escaneie com qualquer leitor de QR Code</li>
                <li>• Cole em etiquetas de produtos</li>
                <li>• Use para rastreamento rápido</li>
                <li>• Compartilhe informações do produto</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
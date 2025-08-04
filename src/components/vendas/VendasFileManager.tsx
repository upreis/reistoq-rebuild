import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

interface VendasFileManagerProps {
  onUploadSuccess: () => void;
}

interface VendaImportacao {
  id_unico: string;
  numero_pedido: string;
  sku_produto: string;
  nome_produto?: string;
  quantidade_vendida: number;
  valor_unitario: number;
  valor_total: number;
  cliente_nome?: string;
  cliente_documento?: string;
  status: string;
  observacoes?: string;
  data_venda: string;
}

export function VendasFileManager({ onUploadSuccess }: VendasFileManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultados, setResultados] = useState<{
    sucesso: number;
    erro: number;
    duplicatas: number;
    erros: string[];
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const templateColumns = [
    'id_unico',
    'numero_pedido', 
    'sku_produto',
    'nome_produto',
    'quantidade_vendida',
    'valor_unitario',
    'valor_total',
    'cliente_nome',
    'cliente_documento',
    'status',
    'observacoes',
    'data_venda'
  ];

  const downloadTemplate = () => {
    const templateData = [
      {
        id_unico: 'VENDA-001',
        numero_pedido: 'PED-12345',
        sku_produto: 'PROD-001',
        nome_produto: 'Produto Exemplo',
        quantidade_vendida: 2,
        valor_unitario: 50.00,
        valor_total: 100.00,
        cliente_nome: 'João Silva',
        cliente_documento: '123.456.789-00',
        status: 'concluida',
        observacoes: 'Venda realizada com sucesso',
        data_venda: '2024-01-15'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Vendas');
    
    // Ajustar largura das colunas
    const colWidths = templateColumns.map(() => ({ wch: 20 }));
    worksheet['!cols'] = colWidths;
    
    XLSX.writeFile(workbook, 'template_historico_vendas.xlsx');
    
    toast({
      title: "Template baixado",
      description: "Template de vendas baixado com sucesso.",
    });
  };

  const validarVenda = (venda: any, linha: number): string[] => {
    const erros: string[] = [];
    
    if (!venda.id_unico?.trim()) {
      erros.push(`Linha ${linha}: ID único é obrigatório`);
    }
    
    if (!venda.numero_pedido?.trim()) {
      erros.push(`Linha ${linha}: Número do pedido é obrigatório`);
    }
    
    if (!venda.sku_produto?.trim()) {
      erros.push(`Linha ${linha}: SKU do produto é obrigatório`);
    }
    
    if (!venda.data_venda) {
      erros.push(`Linha ${linha}: Data da venda é obrigatória`);
    }
    
    const quantidade = parseInt(venda.quantidade_vendida);
    if (isNaN(quantidade) || quantidade < 0) {
      erros.push(`Linha ${linha}: Quantidade vendida deve ser um número positivo`);
    }
    
    const valorUnitario = parseFloat(venda.valor_unitario);
    if (isNaN(valorUnitario) || valorUnitario < 0) {
      erros.push(`Linha ${linha}: Valor unitário deve ser um número positivo`);
    }
    
    const valorTotal = parseFloat(venda.valor_total);
    if (isNaN(valorTotal) || valorTotal < 0) {
      erros.push(`Linha ${linha}: Valor total deve ser um número positivo`);
    }
    
    // Validar status
    const statusValidos = ['concluida', 'pendente', 'cancelada', 'processando'];
    if (venda.status && !statusValidos.includes(venda.status)) {
      erros.push(`Linha ${linha}: Status deve ser um dos seguintes: ${statusValidos.join(', ')}`);
    }
    
    return erros;
  };

  const processarArquivo = async (file: File) => {
    setUploading(true);
    setProgress(0);
    setResultados(null);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      if (jsonData.length === 0) {
        throw new Error('Arquivo está vazio');
      }
      
      const vendasProcessadas: VendaImportacao[] = [];
      const errosValidacao: string[] = [];
      let duplicatas = 0;
      
      // Verificar duplicatas existentes
      const { data: vendasExistentes } = await supabase
        .from('historico_vendas')
        .select('id_unico');
      
      const idsExistentes = new Set(vendasExistentes?.map(v => v.id_unico) || []);
      
      setProgress(20);
      
      // Validar e processar cada linha
      jsonData.forEach((linha: any, index: number) => {
        const numeroLinha = index + 2; // +2 porque Excel começa em 1 e tem header
        const erros = validarVenda(linha, numeroLinha);
        
        if (erros.length > 0) {
          errosValidacao.push(...erros);
          return;
        }
        
        // Verificar duplicata
        if (idsExistentes.has(linha.id_unico)) {
          duplicatas++;
          errosValidacao.push(`Linha ${numeroLinha}: ID único '${linha.id_unico}' já existe`);
          return;
        }
        
        // Converter tipos
        const vendaProcessada: VendaImportacao = {
          id_unico: linha.id_unico.trim(),
          numero_pedido: linha.numero_pedido.trim(),
          sku_produto: linha.sku_produto.trim(),
          nome_produto: linha.nome_produto?.trim() || null,
          quantidade_vendida: parseInt(linha.quantidade_vendida),
          valor_unitario: parseFloat(linha.valor_unitario),
          valor_total: parseFloat(linha.valor_total),
          cliente_nome: linha.cliente_nome?.trim() || null,
          cliente_documento: linha.cliente_documento?.trim() || null,
          status: linha.status || 'concluida',
          observacoes: linha.observacoes?.trim() || null,
          data_venda: linha.data_venda
        };
        
        vendasProcessadas.push(vendaProcessada);
      });
      
      setProgress(50);
      
      // Inserir vendas válidas no banco
      let sucesso = 0;
      if (vendasProcessadas.length > 0) {
        const { data, error } = await supabase
          .from('historico_vendas')
          .insert(vendasProcessadas)
          .select();
        
        if (error) {
          throw error;
        }
        
        sucesso = data?.length || 0;
      }
      
      setProgress(100);
      
      const resultado = {
        sucesso,
        erro: errosValidacao.length,
        duplicatas,
        erros: errosValidacao.slice(0, 10) // Mostrar apenas os primeiros 10 erros
      };
      
      setResultados(resultado);
      
      if (sucesso > 0) {
        toast({
          title: "Upload concluído",
          description: `${sucesso} venda(s) importada(s) com sucesso.`,
        });
        onUploadSuccess();
      }
      
      if (errosValidacao.length > 0) {
        toast({
          title: "Atenção",
          description: `${errosValidacao.length} registro(s) com erro. Verifique o resumo.`,
          variant: "destructive",
        });
      }
      
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
      setResultados({
        sucesso: 0,
        erro: 1,
        duplicatas: 0,
        erros: [error.message]
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!['xlsx', 'xls', 'csv'].includes(fileExtension || '')) {
        toast({
          title: "Formato inválido",
          description: "Apenas arquivos Excel (.xlsx, .xls) e CSV são aceitos.",
          variant: "destructive",
        });
        return;
      }
      
      processarArquivo(file);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Importar/Exportar Vendas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template */}
        <div className="space-y-2">
          <Label>Template</Label>
          <Button 
            variant="outline" 
            onClick={downloadTemplate}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Baixar Template Excel
          </Button>
        </div>
        
        {/* Upload */}
        <div className="space-y-2">
          <Label htmlFor="file-upload">Importar Arquivo</Label>
          <div className="flex gap-2">
            <Input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              disabled={uploading}
              ref={fileInputRef}
              className="flex-1"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              variant="default"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Processando...' : 'Importar'}
            </Button>
          </div>
        </div>
        
        {/* Progress */}
        {uploading && (
          <div className="space-y-2">
            <Label>Progresso do Upload</Label>
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground">
              Processando arquivo... {progress}%
            </p>
          </div>
        )}
        
        {/* Resultados */}
        {resultados && (
          <div className="space-y-3">
            <Label>Resultado do Upload</Label>
            
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                <CheckCircle className="h-4 w-4 text-green-600 mx-auto mb-1" />
                <div className="font-medium text-green-700 dark:text-green-400">
                  {resultados.sucesso}
                </div>
                <div className="text-green-600 dark:text-green-500 text-xs">
                  Sucesso
                </div>
              </div>
              
              <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                <AlertCircle className="h-4 w-4 text-red-600 mx-auto mb-1" />
                <div className="font-medium text-red-700 dark:text-red-400">
                  {resultados.erro}
                </div>
                <div className="text-red-600 dark:text-red-500 text-xs">
                  Erros
                </div>
              </div>
              
              <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                <AlertCircle className="h-4 w-4 text-yellow-600 mx-auto mb-1" />
                <div className="font-medium text-yellow-700 dark:text-yellow-400">
                  {resultados.duplicatas}
                </div>
                <div className="text-yellow-600 dark:text-yellow-500 text-xs">
                  Duplicatas
                </div>
              </div>
            </div>
            
            {resultados.erros.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Erros encontrados:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {resultados.erros.map((erro, index) => (
                      <li key={index}>{erro}</li>
                    ))}
                    {resultados.erro > 10 && (
                      <li className="text-muted-foreground">
                        ... e mais {resultados.erro - 10} erro(s)
                      </li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        {/* Instruções */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-1">Instruções:</div>
            <ul className="text-sm space-y-1">
              <li>• Baixe o template para ver o formato correto</li>
              <li>• Campos obrigatórios: ID único, número do pedido, SKU, data da venda</li>
              <li>• Status válidos: concluida, pendente, cancelada, processando</li>
              <li>• Formatos aceitos: Excel (.xlsx, .xls) e CSV</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  descricao?: string; // renomeado de nome_produto
  quantidade: number; // renomeado de quantidade_vendida
  valor_unitario: number;
  valor_total: number;
  cliente_nome?: string;
  cliente_documento?: string;
  status: string;
  observacoes?: string;
  data_pedido: string; // renomeado de data_venda
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
      
      // Check for duplicates via RPC (read-only access)
      const { data: vendasExistentes } = await supabase.rpc('get_historico_vendas_masked', {
        _start: null,
        _end: null,
        _search: null,
        _limit: 10000,
        _offset: 0
      });
      
      const idsExistentes = new Set(vendasExistentes?.map(v => v.id_unico) || []);
      
      setProgress(20);
      
      // Adicionar logs de debug para verificar estrutura da planilha
      console.log('Primeira linha da planilha:', jsonData[0]);
      console.log('Colunas detectadas:', Object.keys(jsonData[0]));
      
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
        
        // Função para converter data do Excel para formato válido
        const converterDataExcel = (valorData: any): string => {
          if (!valorData) return new Date().toISOString().split('T')[0];
          
          // Se já é uma string no formato correto
          if (typeof valorData === 'string') {
            // Tentar diferentes formatos de data
            const formatosData = [
              /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
              /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
              /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
            ];
            
            for (const formato of formatosData) {
              if (formato.test(valorData)) {
                if (valorData.includes('/')) {
                  const [dia, mes, ano] = valorData.split('/');
                  return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
                } else if (valorData.includes('-') && valorData.indexOf('-') === 2) {
                  const [dia, mes, ano] = valorData.split('-');
                  return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
                }
                return valorData; // YYYY-MM-DD já está correto
              }
            }
          }
          
          // Se é um número (serial do Excel)
          if (typeof valorData === 'number' || !isNaN(Number(valorData))) {
            const numeroSerial = Number(valorData);
            // Excel conta dias desde 1 de janeiro de 1900 (com ajuste para bug do ano 1900)
            const dataExcel = new Date((numeroSerial - 25569) * 86400 * 1000);
            return dataExcel.toISOString().split('T')[0];
          }
          
          // Fallback para data atual
          return new Date().toISOString().split('T')[0];
        };
        
        // Converter tipos (adicionar log de debug)
        console.log(`Processando linha ${numeroLinha}:`, linha);
        
        const vendaProcessada: VendaImportacao = {
          id_unico: linha.id_unico?.toString().trim() || '',
          numero_pedido: linha.numero_pedido?.toString().trim() || '',
          sku_produto: linha.sku_produto?.toString().trim() || '',
          descricao: linha.nome_produto?.toString().trim() || null,
          quantidade: parseInt(linha.quantidade_vendida) || 0,
          valor_unitario: parseFloat(linha.valor_unitario) || 0,
          valor_total: parseFloat(linha.valor_total) || 0,
          cliente_nome: linha.cliente_nome?.toString().trim() || null,
          cliente_documento: linha.cliente_documento?.toString().trim() || null,
          status: linha.status?.toString().trim() || 'concluida',
          observacoes: linha.observacoes?.toString().trim() || null,
          data_pedido: converterDataExcel(linha.data_venda)
        };
        
        console.log(`Venda processada linha ${numeroLinha}:`, vendaProcessada);
        
        vendasProcessadas.push(vendaProcessada);
      });
      
      setProgress(50);
      
      // Insert disabled for security - would need edge function with service_role
      setProgress(100);
      throw new Error('Importação desabilitada por segurança. Funcionalidade será implementada via edge function.');
      
      const sucesso = 0;
      
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

  const exportarDados = async () => {
    try {
      const { data: vendas, error } = await supabase
        .rpc('get_historico_vendas_masked', {
          _start: null,
          _end: null,
          _search: null,
          _limit: 10000,
          _offset: 0
        });

      if (error) throw error;

      if (!vendas || vendas.length === 0) {
        toast({
          title: "Nenhum dado encontrado",
          description: "Não há vendas para exportar.",
          variant: "destructive",
        });
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(vendas);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Histórico de Vendas');
      
      // Ajustar largura das colunas
      const colWidths = templateColumns.map(() => ({ wch: 20 }));
      worksheet['!cols'] = colWidths;
      
      const hoje = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `historico_vendas_${hoje}.xlsx`);
      
      toast({
        title: "Dados exportados",
        description: `${vendas.length} vendas exportadas com sucesso.`,
      });
    } catch (error: any) {
      console.error('Erro ao exportar dados:', error);
      toast({
        title: "Erro na exportação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
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
    <Card className="border-slate-700">
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center gap-2">
          📋 Importar/Exportar Vendas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Três botões principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button 
            variant="outline" 
            onClick={downloadTemplate}
            className="h-12 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white flex flex-col items-center gap-1"
          >
            <div className="flex items-center gap-2">
              📋 <span>Baixar Template</span>
            </div>
            <span className="text-xs text-slate-400">Baixe um modelo com exemplos</span>
          </Button>
          
          <Button 
            variant="outline" 
            onClick={exportarDados}
            className="h-12 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white flex flex-col items-center gap-1"
          >
            <div className="flex items-center gap-2">
              ⬇️ <span>Exportar Dados</span>
            </div>
            <span className="text-xs text-slate-400">Exporte todas as vendas</span>
          </Button>
          
          <Button 
            onClick={handleFileSelect}
            disabled={uploading}
            className="h-12 bg-yellow-500 text-black hover:bg-yellow-600 flex flex-col items-center gap-1"
          >
            <div className="flex items-center gap-2">
              ⬆️ <span>{uploading ? 'Processando...' : 'Importar Planilha'}</span>
            </div>
            <span className="text-xs opacity-80">
              {uploading ? `${progress}%` : 'Selecione arquivo XLSX para importar'}
            </span>
          </Button>
        </div>

        {/* Input de arquivo oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Progress bar */}
        {uploading && (
          <div className="space-y-2">
            <Progress value={progress} className="bg-slate-700" />
            <p className="text-sm text-slate-400 text-center">
              Processando arquivo... {progress}%
            </p>
          </div>
        )}
        
        {/* Resultados */}
        {resultados && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-center p-3 bg-green-900/30 border border-green-700 rounded">
                <CheckCircle className="h-4 w-4 text-green-400 mx-auto mb-1" />
                <div className="font-medium text-green-400">
                  {resultados.sucesso}
                </div>
                <div className="text-green-500 text-xs">
                  Sucesso
                </div>
              </div>
              
              <div className="text-center p-3 bg-red-900/30 border border-red-700 rounded">
                <AlertCircle className="h-4 w-4 text-red-400 mx-auto mb-1" />
                <div className="font-medium text-red-400">
                  {resultados.erro}
                </div>
                <div className="text-red-500 text-xs">
                  Erros
                </div>
              </div>
              
              <div className="text-center p-3 bg-yellow-900/30 border border-yellow-700 rounded">
                <AlertCircle className="h-4 w-4 text-yellow-400 mx-auto mb-1" />
                <div className="font-medium text-yellow-400">
                  {resultados.duplicatas}
                </div>
                <div className="text-yellow-500 text-xs">
                  Duplicatas
                </div>
              </div>
            </div>
            
            {resultados.erros.length > 0 && (
              <Alert className="bg-red-900/20 border-red-700">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">
                  <div className="font-medium mb-2">Erros encontrados:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {resultados.erros.slice(0, 5).map((erro, index) => (
                      <li key={index}>{erro}</li>
                    ))}
                    {resultados.erro > 5 && (
                      <li className="text-red-400">
                        ... e mais {resultados.erro - 5} erro(s)
                      </li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
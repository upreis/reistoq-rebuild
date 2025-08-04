import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DeParaFileManagerProps {
  onUploadSuccess: () => void;
}

export function DeParaFileManager({ onUploadSuccess }: DeParaFileManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const gerarTemplateExemplo = () => {
    const dadosExemplo = [
      {
        'SKU Do Pedido': 'SKU001-KIT',
        'SKU Correto Do Pedido': 'SKU001-CORRIGIDO', 
        'SKU Unitario': 'SKU001-UNIT',
        'Quantidade Do Kit': 2,
        'Observacoes': 'Mapeamento exemplo'
      },
      {
        'SKU Do Pedido': 'SKU002-KIT',
        'SKU Correto Do Pedido': 'SKU002-CORRIGIDO',
        'SKU Unitario': 'SKU002-UNIT', 
        'Quantidade Do Kit': 1,
        'Observacoes': ''
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(dadosExemplo);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mapeamentos');
    
    // Definir larguras das colunas
    const colWidths = [
      { wch: 20 }, // SKU Do Pedido
      { wch: 25 }, // SKU Correto Do Pedido
      { wch: 20 }, // SKU Unitario
      { wch: 18 }, // Quantidade Do Kit
      { wch: 25 }  // Observacoes
    ];
    worksheet['!cols'] = colWidths;
    
    XLSX.writeFile(workbook, 'template_mapeamentos_depara.xlsx');
    
    toast({
      title: "Template baixado",
      description: "O arquivo template foi baixado com sucesso.",
    });
  };

  const downloadMapeamentos = async () => {
    try {
      setDownloading(true);
      
      const { data: mapeamentos, error } = await supabase
        .from('mapeamentos_depara')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!mapeamentos || mapeamentos.length === 0) {
        toast({
          title: "Nenhum dado encontrado",
          description: "Não há mapeamentos cadastrados para exportar.",
          variant: "destructive",
        });
        return;
      }

      // Mapear os dados para o formato da planilha
      const dadosParaExportar = mapeamentos.map(mapeamento => ({
        'SKU Do Pedido': mapeamento.sku_pedido,
        'SKU Correto Do Pedido': mapeamento.sku_correspondente,
        'SKU Unitario': mapeamento.sku_simples || '',
        'Quantidade Do Kit': mapeamento.quantidade,
        'Ativo': mapeamento.ativo ? 'Sim' : 'Não',
        'Observacoes': mapeamento.observacoes || '',
        'Data Criacao': new Date(mapeamento.created_at).toLocaleDateString('pt-BR'),
        'Ultima Atualizacao': new Date(mapeamento.updated_at).toLocaleDateString('pt-BR')
      }));

      const worksheet = XLSX.utils.json_to_sheet(dadosParaExportar);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Mapeamentos');
      
      // Definir larguras das colunas
      const colWidths = [
        { wch: 20 }, // SKU Do Pedido
        { wch: 25 }, // SKU Correto Do Pedido
        { wch: 20 }, // SKU Unitario
        { wch: 18 }, // Quantidade Do Kit
        { wch: 10 }, // Ativo
        { wch: 25 }, // Observacoes
        { wch: 15 }, // Data Criacao
        { wch: 18 }  // Ultima Atualizacao
      ];
      worksheet['!cols'] = colWidths;
      
      const nomeArquivo = `mapeamentos_depara_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, nomeArquivo);

      toast({
        title: "Exportação concluída",
        description: `${mapeamentos.length} mapeamento(s) exportados com sucesso.`,
      });
    } catch (error: any) {
      console.error('Erro ao exportar mapeamentos:', error);
      toast({
        title: "Erro na exportação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const processarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast({
          title: "Arquivo vazio",
          description: "O arquivo não contém dados válidos.",
          variant: "destructive",
        });
        return;
      }

      // Verificar duplicatas no arquivo
      const skusPedido = jsonData.map(row => row['SKU Do Pedido']).filter(Boolean);
      const skusDuplicados = skusPedido.filter((sku, index) => skusPedido.indexOf(sku) !== index);
      
      if (skusDuplicados.length > 0) {
        toast({
          title: "SKUs duplicados encontrados",
          description: `Os seguintes SKUs estão duplicados no arquivo: ${skusDuplicados.join(', ')}`,
          variant: "destructive",
        });
        return;
      }

      // Verificar se já existem no banco
      const { data: existentes } = await supabase
        .from('mapeamentos_depara')
        .select('sku_pedido')
        .in('sku_pedido', skusPedido);

      if (existentes && existentes.length > 0) {
        const skusExistentes = existentes.map(item => item.sku_pedido);
        toast({
          title: "SKUs já cadastrados",
          description: `Os seguintes SKUs já existem: ${skusExistentes.join(', ')}. Use a funcionalidade de edição para atualizá-los.`,
          variant: "destructive",
        });
        return;
      }

      let sucessos = 0;
      let erros = 0;

      for (const row of jsonData) {
        try {
          const mapeamento = {
            sku_pedido: row['SKU Do Pedido'],
            sku_correspondente: row['SKU Correto Do Pedido'],
            sku_simples: row['SKU Unitario'] || null,
            quantidade: parseInt(row['Quantidade Do Kit']) || 1,
            ativo: true,
            observacoes: row['Observacoes'] || null
          };

          if (!mapeamento.sku_pedido || !mapeamento.sku_correspondente) {
            console.warn('Linha ignorada - campos obrigatórios em falta:', row);
            erros++;
            continue;
          }

          const { error: insertError } = await supabase
            .from('mapeamentos_depara')
            .upsert(mapeamento, { 
              onConflict: 'sku_pedido',
              ignoreDuplicates: false 
            });

          if (insertError) {
            console.error('Erro ao inserir mapeamento:', insertError);
            erros++;
          } else {
            sucessos++;
          }
        } catch (err) {
          console.error('Erro ao processar linha:', err);
          erros++;
        }
      }

      if (sucessos > 0) {
        toast({
          title: "Upload concluído",
          description: `${sucessos} mapeamento(s) importados com sucesso${erros > 0 ? ` (${erros} erro(s))` : ''}.`,
        });
        onUploadSuccess();
      } else {
        toast({
          title: "Nenhum mapeamento importado",
          description: "Verifique o formato do arquivo e tente novamente.",
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
    } finally {
      setUploading(false);
      // Reset do input file
      event.target.value = '';
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Importar/Exportar Mapeamentos
        </CardTitle>
        <CardDescription>
          Importe mapeamentos via planilha XLSX ou exporte os dados atuais
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Button
              onClick={gerarTemplateExemplo}
              variant="outline"
              className="w-full gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Baixar Template
            </Button>
            <p className="text-xs text-muted-foreground">
              Baixe um modelo com exemplos
            </p>
          </div>

          <div className="space-y-2">
            <Button
              onClick={downloadMapeamentos}
              variant="outline"
              className="w-full gap-2"
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Exportar Dados
            </Button>
            <p className="text-xs text-muted-foreground">
              Exporte todos os mapeamentos
            </p>
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => document.getElementById('file-upload-depara')?.click()}
              className="w-full gap-2"
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Importar Planilha
            </Button>
            <Input
              id="file-upload-depara"
              type="file"
              accept=".xlsx,.xls"
              onChange={processarUpload}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground">
              Selecione arquivo XLSX para importar
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
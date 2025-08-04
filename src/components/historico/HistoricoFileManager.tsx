import { useState } from "react";
import { Upload, Download, FileText, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { supabase } from "@/integrations/supabase/client";

interface HistoricoFileManagerProps {
  onUploadSuccess: () => void;
}

export function HistoricoFileManager({ onUploadSuccess }: HistoricoFileManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo Excel (.xlsx ou .xls)",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      setProgress(10);

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          setProgress(50);

          // Processar dados e inserir no banco
          const movimentacoes = jsonData.map((row: any) => ({
            produto_id: row.produto_id,
            tipo_movimentacao: row.tipo_movimentacao,
            quantidade_anterior: parseInt(row.quantidade_anterior) || 0,
            quantidade_nova: parseInt(row.quantidade_nova) || 0,
            quantidade_movimentada: parseInt(row.quantidade_movimentada) || 0,
            motivo: row.motivo || 'Importação em lote',
            observacoes: row.observacoes || null,
          }));

          setProgress(80);

          const { error } = await supabase
            .from('movimentacoes_estoque')
            .insert(movimentacoes);

          if (error) throw error;

          setProgress(100);

          toast({
            title: "Upload realizado com sucesso",
            description: `${movimentacoes.length} movimentação(ões) importada(s)`,
          });

          onUploadSuccess();
          
          // Reset file input
          event.target.value = '';
        } catch (error: any) {
          console.error('Erro ao processar arquivo:', error);
          toast({
            title: "Erro ao processar arquivo",
            description: error.message,
            variant: "destructive",
          });
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const baixarTemplate = () => {
    const template = [
      {
        produto_id: "uuid-do-produto",
        tipo_movimentacao: "entrada",
        quantidade_anterior: 10,
        quantidade_nova: 20,
        quantidade_movimentada: 10,
        motivo: "Reposição de estoque",
        observacoes: "Observações opcionais"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    
    // Ajustar largura das colunas
    const colWidths = [
      { width: 30 }, // produto_id
      { width: 20 }, // tipo_movimentacao
      { width: 20 }, // quantidade_anterior
      { width: 15 }, // quantidade_nova
      { width: 25 }, // quantidade_movimentada
      { width: 30 }, // motivo
      { width: 40 }, // observacoes
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, 'template_movimentacoes.xlsx');
  };

  const exportarDados = async () => {
    try {
      const { data, error } = await supabase
        .from('movimentacoes_estoque')
        .select(`
          *,
          produto:produtos(
            nome,
            sku_interno
          )
        `)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const dadosExportacao = data?.map(mov => ({
        Data: new Date(mov.created_at).toLocaleDateString('pt-BR'),
        Produto: mov.produto?.nome || 'N/A',
        SKU: mov.produto?.sku_interno || 'N/A',
        'Tipo Movimentação': mov.tipo_movimentacao,
        'Quantidade Anterior': mov.quantidade_anterior,
        'Quantidade Nova': mov.quantidade_nova,
        'Quantidade Movimentada': mov.quantidade_movimentada,
        Motivo: mov.motivo || '',
        Observações: mov.observacoes || '',
      })) || [];

      const ws = XLSX.utils.json_to_sheet(dadosExportacao);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Movimentações");
      
      XLSX.writeFile(wb, `movimentacoes_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({
        title: "Exportação concluída",
        description: `${dadosExportacao.length} movimentação(ões) exportada(s)`,
      });
    } catch (error: any) {
      console.error('Erro na exportação:', error);
      toast({
        title: "Erro na exportação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Gerenciar Arquivos
        </CardTitle>
        <CardDescription>
          Importe ou exporte dados de movimentações via planilha Excel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processando arquivo...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button
            variant="outline"
            onClick={baixarTemplate}
            className="flex items-center gap-2"
            disabled={uploading}
          >
            <Download className="h-4 w-4" />
            Template
          </Button>

          <div className="relative">
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={uploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button
              variant="outline"
              className="w-full flex items-center gap-2"
              disabled={uploading}
            >
              <Upload className="h-4 w-4" />
              Importar
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={exportarDados}
            className="flex items-center gap-2"
            disabled={uploading}
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>

        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
          <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Formato do arquivo:</p>
            <p>• Arquivo Excel (.xlsx ou .xls)</p>
            <p>• Colunas: produto_id, tipo_movimentacao, quantidade_anterior, quantidade_nova, quantidade_movimentada, motivo, observacoes</p>
            <p>• Use o template para garantir o formato correto</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
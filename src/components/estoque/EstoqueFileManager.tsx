import { useState } from "react";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { supabase } from "@/integrations/supabase/client";

interface EstoqueFileManagerProps {
  onUploadSuccess: () => void;
}

export function EstoqueFileManager({ onUploadSuccess }: EstoqueFileManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const gerarTemplateExemplo = () => {
    const dadosExemplo = [
      {
        'Código de Barras': '7.89E+13',
        'SKU Interno': 'CMD-346-BRAN-1',
        'Nome do Produto': 'CMD-346-BRAN-1',
        'Categoria': 'Casa',
        'Quantidade Atual': 10000,
        'Estoque Mínimo': 1000,
        'Estoque Máximo': 11000,
        'Localização': 'A7',
        'Preço de Custo': 7,
        'Preço de Venda': 8,
        'URL Imagem': '',
        'Status': 'ativo'
      },
      {
        'Código de Barras': '7.89E+13',
        'SKU Interno': 'CMD-346-PRET-1',
        'Nome do Produto': 'CMD-346-PRET-1',
        'Categoria': 'Casa',
        'Quantidade Atual': 10000,
        'Estoque Mínimo': 1000,
        'Estoque Máximo': 11000,
        'Localização': 'A2',
        'Preço de Custo': 2,
        'Preço de Venda': 3,
        'URL Imagem': '',
        'Status': 'ativo'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(dadosExemplo);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estoque Template");
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, 'template_estoque_exemplo.xlsx');
    
    toast.success("Template de exemplo baixado com sucesso!");
  };

  const downloadEstoque = async () => {
    setDownloading(true);
    try {
      const { data: produtos, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome');

      if (error) throw error;

      if (!produtos || produtos.length === 0) {
        toast.warning("Nenhum produto encontrado para download");
        return;
      }

      const dadosFormatados = produtos.map(produto => ({
        'Código de Barras': produto.codigo_barras || '',
        'SKU Interno': produto.sku_interno,
        'Nome do Produto': produto.nome,
        'Categoria': produto.categoria || '',
        'Quantidade Atual': produto.quantidade_atual,
        'Estoque Mínimo': produto.estoque_minimo,
        'Estoque Máximo': produto.estoque_maximo,
        'Localização': produto.localizacao || '',
        'Preço de Custo': produto.preco_custo || 0,
        'Preço de Venda': produto.preco_venda || 0,
        'URL Imagem': produto.url_imagem || '',
        'Status': produto.status,
        'Criado em': new Date(produto.created_at).toLocaleDateString('pt-BR'),
        'Atualizado em': new Date(produto.updated_at).toLocaleDateString('pt-BR')
      }));

      // Excel
      const ws = XLSX.utils.json_to_sheet(dadosFormatados);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Estoque");
      
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(data, `estoque_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast.success(`${produtos.length} produtos exportados com sucesso!`);
    } catch (error) {
      console.error('Erro ao baixar estoque:', error);
      toast.error("Erro ao baixar dados do estoque");
    } finally {
      setDownloading(false);
    }
  };

  const processarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (jsonData.length === 0) {
        toast.error("Arquivo vazio ou formato inválido");
        return;
      }

      let sucessos = 0;
      let erros = 0;

      for (const row of jsonData) {
        try {
          const statusRaw = row['Status']?.toString()?.toLowerCase() || 'ativo';
          // Mapear valores válidos para a constraint
          const statusValidos = ['ativo', 'baixo', 'critico', 'inativo'];
          const status = statusValidos.includes(statusRaw) ? statusRaw : 'ativo';

          const produto = {
            codigo_barras: row['Código de Barras']?.toString() || null,
            sku_interno: row['SKU Interno']?.toString() || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            nome: row['Nome do Produto']?.toString() || '',
            categoria: row['Categoria']?.toString() || null,
            quantidade_atual: parseInt(row['Quantidade Atual']) || 0,
            estoque_minimo: parseInt(row['Estoque Mínimo']) || 0,
            estoque_maximo: parseInt(row['Estoque Máximo']) || 0,
            localizacao: row['Localização']?.toString() || null,
            preco_custo: parseFloat(row['Preço de Custo']) || 0,
            preco_venda: parseFloat(row['Preço de Venda']) || 0,
            url_imagem: row['URL Imagem']?.toString() || null,
            status: status
          };

          if (!produto.nome) {
            erros++;
            continue;
          }

          const { error } = await supabase
            .from('produtos')
            .upsert(produto, { 
              onConflict: 'sku_interno',
              ignoreDuplicates: false 
            });

          if (error) {
            console.error('Erro ao inserir produto:', produto, error);
            toast.error(`Erro no produto ${produto.nome}: ${error.message}`);
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
        toast.success(`${sucessos} produtos importados com sucesso!`);
        onUploadSuccess();
      }
      if (erros > 0) {
        toast.warning(`${erros} produtos com erro durante a importação`);
      }
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error("Erro ao processar arquivo. Verifique o formato.");
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Importar/Exportar Estoque</CardTitle>
        <CardDescription>
          Gerencie seus dados de estoque via planilhas XLSX/CSV
          <br />
          <span className="text-xs text-muted-foreground">
            Status válidos: ativo, baixo, critico, inativo
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={processarUpload}
              disabled={uploading}
              className="sr-only"
              id="upload-estoque"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              asChild
            >
              <label htmlFor="upload-estoque" className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Importando..." : "Importar"}
              </label>
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={downloadEstoque}
            disabled={downloading}
          >
            <Download className="mr-2 h-4 w-4" />
            {downloading ? "Exportando..." : "Exportar"}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={gerarTemplateExemplo}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Template
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
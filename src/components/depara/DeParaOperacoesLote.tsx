import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileSpreadsheet, Download, Upload, Settings } from 'lucide-react';
import { useAutoMapearSku } from '@/hooks/useAutoMapearSku';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface DeParaOperacoesLoteProps {
  mapeamentosSelecionados: string[];
  onRecarregarDados: () => void;
}

export function DeParaOperacoesLote({ 
  mapeamentosSelecionados, 
  onRecarregarDados 
}: DeParaOperacoesLoteProps) {
  const [prioridadeLote, setPrioridadeLote] = useState<'baixa' | 'normal' | 'alta' | 'urgente'>('normal');
  const [observacoesLote, setObservacoesLote] = useState('');
  const [loading, setLoading] = useState(false);
  const { atualizarPrioridade } = useAutoMapearSku();
  const { toast } = useToast();

  const atualizarPrioridadeLote = async () => {
    if (mapeamentosSelecionados.length === 0) {
      toast({
        title: 'Nenhum Item Selecionado',
        description: 'Selecione pelo menos um mapeamento para atualizar',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      const promessas = mapeamentosSelecionados.map(id => 
        atualizarPrioridade(id, prioridadeLote)
      );

      await Promise.all(promessas);

      toast({
        title: 'Prioridades Atualizadas',
        description: `${mapeamentosSelecionados.length} mapeamento(s) atualizado(s) para prioridade ${prioridadeLote}`,
      });

      onRecarregarDados();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar prioridades em lote',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportarParaExcel = () => {
    try {
      // Simular dados para export - em produção viria do backend
      const dadosExport = [
        ['SKU Pedido', 'SKU Correspondente', 'Quantidade', 'Prioridade', 'Status', 'Observações'],
        ['EXAMPLE001', 'PROD001', '1', 'alta', 'pendente', 'Exemplo de mapeamento'],
        ['EXAMPLE002', '', '2', 'normal', 'pendente', 'Aguardando mapeamento']
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(dadosExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Mapeamentos DePara');

      // Aplicar formatação básica
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let col = range.s.c; col <= range.e.c; col++) {
        const headerCell = XLSX.utils.encode_cell({ r: 0, c: col });
        if (worksheet[headerCell]) {
          worksheet[headerCell].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: "E3F2FD" } }
          };
        }
      }

      XLSX.writeFile(workbook, `mapeamentos_depara_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({
        title: 'Exportação Concluída',
        description: 'Arquivo Excel baixado com sucesso',
      });
    } catch (error) {
      toast({
        title: 'Erro na Exportação',
        description: 'Erro ao gerar arquivo Excel',
        variant: 'destructive',
      });
    }
  };

  const handleImportarExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        console.log('Dados importados:', jsonData);

        toast({
          title: 'Arquivo Carregado',
          description: `${jsonData.length} linhas detectadas. Implementar processamento...`,
        });

        // Aqui implementaria o processamento dos dados
        // por enquanto só mostra o que foi lido
      } catch (error) {
        toast({
          title: 'Erro na Importação',
          description: 'Erro ao processar arquivo Excel',
          variant: 'destructive',
        });
      }
    };

    reader.readAsArrayBuffer(file);
    event.target.value = ''; // Limpar input
  };

  const baixarTemplate = () => {
    const template = [
      ['SKU Pedido', 'SKU Correspondente', 'Quantidade', 'Prioridade', 'Observações'],
      ['EXEMPLO001', 'PROD001', '1', 'normal', 'Mapeamento de exemplo'],
      ['EXEMPLO002', 'PROD002', '2', 'alta', 'Produto com alta prioridade'],
      ['EXEMPLO003', '', '1', 'urgente', 'Aguardando mapeamento urgente']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

    XLSX.writeFile(workbook, 'template_mapeamentos_depara.xlsx');

    toast({
      title: 'Template Baixado',
      description: 'Use este arquivo como modelo para importação',
    });
  };

  return (
    <div className="space-y-4">
      {/* Operações em Lote */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Operações em Lote
          </CardTitle>
          <CardDescription>
            Aplicar alterações a múltiplos mapeamentos simultaneamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mapeamentosSelecionados.length > 0 && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary">
                  {mapeamentosSelecionados.length} item(s) selecionado(s)
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Prioridade</label>
                  <Select value={prioridadeLote} onValueChange={(value: any) => setPrioridadeLote(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                          Baixa
                        </span>
                      </SelectItem>
                      <SelectItem value="normal">
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                          Normal
                        </span>
                      </SelectItem>
                      <SelectItem value="alta">
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                          Alta
                        </span>
                      </SelectItem>
                      <SelectItem value="urgente">
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-400"></div>
                          Urgente
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Observações (opcional)</label>
                  <Textarea
                    placeholder="Adicionar observações a todos os itens selecionados..."
                    value={observacoesLote}
                    onChange={(e) => setObservacoesLote(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <Button 
                onClick={atualizarPrioridadeLote}
                disabled={loading}
                className="mt-4"
              >
                {loading ? 'Atualizando...' : 'Aplicar Alterações'}
              </Button>
            </div>
          )}

          {mapeamentosSelecionados.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              Selecione mapeamentos na tabela para realizar operações em lote
            </div>
          )}
        </CardContent>
      </Card>

      {/* Importação/Exportação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importação e Exportação
          </CardTitle>
          <CardDescription>
            Gerenciar mapeamentos via arquivos Excel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={baixarTemplate}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Baixar Template
            </Button>

            <div className="relative">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportarExcel}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline" className="w-full flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Importar Excel
              </Button>
            </div>

            <Button
              onClick={exportarParaExcel}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar Dados
            </Button>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            💡 <strong>Dica:</strong> Baixe o template para ver o formato correto dos dados
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
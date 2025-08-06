import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ResultadoProcessamento {
  total_itens: number;
  processados_sucesso: number;
  falta_estoque: number;
  falta_mapeamento: number;
  produtos_inativos: number;
  detalhes: {
    sucessos: any[];
    erros_estoque: any[];
    erros_mapeamento: any[];
    erros_produtos_inativos: any[];
  };
}

interface ProcessamentoResponse {
  message: string;
  resultado: ResultadoProcessamento;
  alertas_enviados: boolean;
}

export const useProcessamentoAutomatico = () => {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoProcessamento | null>(null);
  const { toast } = useToast();

  const executarProcessamentoCompleto = async (): Promise<ProcessamentoResponse | null> => {
    setLoading(true);
    setResultado(null);

    try {
      console.log('🚀 Iniciando processamento automático completo...');
      
      const { data, error } = await supabase.functions.invoke('processamento-automatico-completo');

      if (error) {
        throw error;
      }

      const response = data as ProcessamentoResponse;
      setResultado(response.resultado);

      // Mostrar toast com resumo
      if (response.resultado.processados_sucesso > 0) {
        toast({
          title: "✅ Processamento Concluído!",
          description: `${response.resultado.processados_sucesso} itens processados com sucesso. ${
            response.alertas_enviados ? 'Alertas enviados via Telegram.' : ''
          }`,
          duration: 5000,
        });
      } else {
        toast({
          title: "⚠️ Nenhum Item Processado",
          description: "Verifique os alertas para mais detalhes.",
          variant: "default",
          duration: 5000,
        });
      }

      // Mostrar alertas específicos se houver erros
      if (response.resultado.falta_estoque > 0) {
        toast({
          title: "🚨 Produtos Sem Estoque",
          description: `${response.resultado.falta_estoque} produtos precisam de reposição.`,
          variant: "destructive",
          duration: 8000,
        });
      }

      if (response.resultado.falta_mapeamento > 0) {
        toast({
          title: "🔗 Mapeamentos Pendentes", 
          description: `${response.resultado.falta_mapeamento} SKUs precisam de mapeamento DePara.`,
          variant: "destructive",
          duration: 8000,
        });
      }

      if (response.resultado.produtos_inativos > 0) {
        toast({
          title: "⚠️ Produtos Inativos",
          description: `${response.resultado.produtos_inativos} produtos estão inativos.`,
          variant: "destructive", 
          duration: 8000,
        });
      }

      console.log('✅ Processamento concluído:', response);
      return response;

    } catch (error: any) {
      console.error('❌ Erro no processamento automático:', error);
      
      toast({
        title: "❌ Erro no Processamento",
        description: error.message || "Erro interno do servidor",
        variant: "destructive",
        duration: 8000,
      });

      return null;
    } finally {
      setLoading(false);
    }
  };

  const gerarRelatorioDetalhado = () => {
    if (!resultado) return null;

    const relatorio = {
      resumo: {
        total_itens: resultado.total_itens,
        processados_sucesso: resultado.processados_sucesso,
        total_erros: resultado.falta_estoque + resultado.falta_mapeamento + resultado.produtos_inativos,
        taxa_sucesso: resultado.total_itens > 0 ? 
          ((resultado.processados_sucesso / resultado.total_itens) * 100).toFixed(1) + '%' : '0%'
      },
      erros_por_categoria: {
        falta_estoque: resultado.falta_estoque,
        falta_mapeamento: resultado.falta_mapeamento,
        produtos_inativos: resultado.produtos_inativos
      },
      detalhes: resultado.detalhes
    };

    return relatorio;
  };

  const downloadRelatorio = () => {
    const relatorio = gerarRelatorioDetalhado();
    if (!relatorio) {
      toast({
        title: "❌ Erro",
        description: "Nenhum resultado disponível para download",
        variant: "destructive",
      });
      return;
    }

    try {
      const dataStr = JSON.stringify(relatorio, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `processamento_automatico_${new Date().toISOString().split('T')[0]}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);

      toast({
        title: "📄 Relatório Baixado",
        description: "Relatório detalhado salvo com sucesso",
      });
    } catch (error) {
      console.error('Erro ao fazer download:', error);
      toast({
        title: "❌ Erro no Download",
        description: "Não foi possível baixar o relatório",
        variant: "destructive",
      });
    }
  };

  return {
    loading,
    resultado,
    executarProcessamentoCompleto,
    gerarRelatorioDetalhado,
    downloadRelatorio,
  };
};
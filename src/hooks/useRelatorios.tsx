import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RelatorioRequest {
  tipo: 'estoque_baixo' | 'movimentacoes' | 'valor_estoque' | 'produtos_inativos';
  dataInicio?: string;
  dataFim?: string;
  categoria?: string;
}

export function useRelatorios() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const gerarRelatorio = async (request: RelatorioRequest) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('relatorio-estoque', {
        body: request
      });

      if (error) {
        throw error;
      }

      if (!data.sucesso) {
        throw new Error(data.error || 'Erro ao gerar relatório');
      }

      toast({
        title: "Relatório gerado",
        description: `Relatório de ${request.tipo.replace('_', ' ')} gerado com sucesso!`,
      });

      return data.relatorio;
    } catch (err: any) {
      console.error('Erro ao gerar relatório:', err);
      const errorMessage = err.message || 'Erro inesperado ao gerar relatório';
      setError(errorMessage);
      toast({
        title: "Erro ao gerar relatório",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const enviarAlertas = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('alertas-estoque');

      if (error) {
        throw error;
      }

      if (data.produtos_alerta === 0) {
        toast({
          title: "Nenhum alerta necessário",
          description: "Não há produtos em estoque baixo no momento.",
        });
      } else {
        let mensagem = `Alertas enviados para ${data.produtos_alerta} produtos.`;
        
        if (data.telegram && !data.telegram.error) {
          mensagem += " ✓ Telegram";
        }
        if (data.email && !data.email.error) {
          mensagem += " ✓ Email";
        }

        toast({
          title: "Alertas enviados",
          description: mensagem,
        });
      }

      return data;
    } catch (err: any) {
      console.error('Erro ao enviar alertas:', err);
      const errorMessage = err.message || 'Erro inesperado ao enviar alertas';
      setError(errorMessage);
      toast({
        title: "Erro ao enviar alertas",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const downloadRelatorio = (relatorio: any, tipo: string) => {
    try {
      const dataStr = JSON.stringify(relatorio, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `relatorio_${tipo}_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      toast({
        title: "Download iniciado",
        description: "O relatório foi baixado com sucesso!",
      });
    } catch (err: any) {
      console.error('Erro ao fazer download:', err);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o relatório.",
        variant: "destructive",
      });
    }
  };

  return {
    loading,
    error,
    gerarRelatorio,
    enviarAlertas,
    downloadRelatorio
  };
}
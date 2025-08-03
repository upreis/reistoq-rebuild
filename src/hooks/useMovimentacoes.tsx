import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MovimentacaoEstoque {
  id: string;
  produto_id: string;
  tipo_movimentacao: string;
  quantidade_anterior: number;
  quantidade_nova: number;
  quantidade_movimentada: number;
  motivo: string | null;
  observacoes: string | null;
  created_at: string;
  produtos?: {
    nome: string;
    sku_interno: string;
  };
}

export function useMovimentacoes() {
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const buscarMovimentacoes = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('movimentacoes_estoque')
        .select(`
          *,
          produtos (
            nome,
            sku_interno
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        throw error;
      }

      setMovimentacoes(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar movimentações:', err);
      setError(err.message);
      toast({
        title: "Erro ao carregar movimentações",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const registrarMovimentacao = async (
    produtoId: string,
    quantidadeAtual: number,
    novaQuantidade: number,
    motivo: string,
    observacoes?: string
  ) => {
    try {
      const tipo = novaQuantidade > quantidadeAtual ? 'entrada' : 'saida';
      const quantidadeMovimentada = Math.abs(novaQuantidade - quantidadeAtual);

      const { error } = await supabase
        .from('movimentacoes_estoque')
        .insert({
          produto_id: produtoId,
          tipo_movimentacao: tipo,
          quantidade_anterior: quantidadeAtual,
          quantidade_nova: novaQuantidade,
          quantidade_movimentada: quantidadeMovimentada,
          motivo,
          observacoes
        });

      if (error) {
        throw error;
      }

      // Atualizar a quantidade do produto
      const { error: updateError } = await supabase
        .from('produtos')
        .update({ 
          quantidade_atual: novaQuantidade,
          ultima_movimentacao: new Date().toISOString()
        })
        .eq('id', produtoId);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Movimentação registrada",
        description: `${tipo === 'entrada' ? 'Entrada' : 'Saída'} de ${quantidadeMovimentada} unidades registrada com sucesso.`,
      });

      buscarMovimentacoes();
    } catch (err: any) {
      console.error('Erro ao registrar movimentação:', err);
      toast({
        title: "Erro ao registrar movimentação",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    buscarMovimentacoes();
  }, []);

  // Setup realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('movimentacoes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'movimentacoes_estoque'
        },
        () => {
          console.log('Movimentação atualizada, recarregando dados...');
          buscarMovimentacoes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    movimentacoes,
    loading,
    error,
    registrarMovimentacao,
    recarregarDados: buscarMovimentacoes
  };
}
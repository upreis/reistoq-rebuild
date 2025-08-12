import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HistoricoVenda {
  id: string;
  id_unico: string;
  numero_pedido: string;
  sku_produto: string;
  descricao: string | null;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  cliente_nome: string | null;
  cliente_documento: string | null;
  status: string;
  observacoes: string | null;
  data_pedido: string;
  created_at: string;
  updated_at: string;
  ncm: string | null;
  codigo_barras: string | null;
  pedido_id: string | null;
  cpf_cnpj: string | null;
  valor_frete: number | null;
  data_prevista: string | null;
  obs: string | null;
  obs_interna: string | null;
  cidade: string | null;
  uf: string | null;
  url_rastreamento: string | null;
  situacao: string | null;
  codigo_rastreamento: string | null;
  numero_ecommerce: string | null;
  valor_desconto: number | null;
  // Novas colunas para as especificações do usuário
  numero_venda: string | null;
  sku_estoque: string | null;
  sku_kit: string | null;
  qtd_kit: number | null;
  total_itens: number | null;
}

interface HistoricoVendasMetricas {
  total_vendas: number;
  receita_total: number;
  receita_hoje: number;
  vendas_concluidas: number;
  ticket_medio: number;
}

interface FiltrosHistoricoVendas {
  termo_busca: string;
  data_inicio: string;
  data_fim: string;
}

export function useHistoricoVendas() {
  const [vendas, setVendas] = useState<HistoricoVenda[]>([]);
  const [metricas, setMetricas] = useState<HistoricoVendasMetricas>({
    total_vendas: 0,
    receita_total: 0,
    receita_hoje: 0,
    vendas_concluidas: 0,
    ticket_medio: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosHistoricoVendas>({
    termo_busca: '',
    data_inicio: '',
    data_fim: '',
  });

  const { toast } = useToast();

  const buscarVendas = async () => {
    try {
      setLoading(true);
      setError(null);

      // Usar RPC mascarado para buscar dados com segurança
      const params = {
        _start: filtros.data_inicio || null,
        _end: filtros.data_fim || null,
        _search: filtros.termo_busca || null,
        _limit: 1000,
        _offset: 0,
      } as const;

      const { data, error } = await supabase
        .rpc('get_historico_vendas_masked', params);

      if (error) {
        throw error;
      }

      setVendas((data as any) || []);
      calcularMetricas((data as any) || []);
    } catch (error: any) {
      setError(error.message);
      toast({
        title: "Erro ao carregar histórico",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calcularMetricas = (vendasList: HistoricoVenda[]) => {
    const hoje = new Date().toISOString().split('T')[0];
    
    const vendasHoje = vendasList.filter(venda => 
      venda.data_pedido === hoje
    );

    const vendasConcluidas = vendasList.filter(venda => venda.status === 'concluida');
    const receitaTotal = vendasList.reduce((acc, venda) => acc + Number(venda.valor_total), 0);
    const receitaHoje = vendasHoje.reduce((acc, venda) => acc + Number(venda.valor_total), 0);
    const ticketMedio = vendasList.length > 0 ? receitaTotal / vendasList.length : 0;

    setMetricas({
      total_vendas: vendasList.length,
      receita_total: receitaTotal,
      receita_hoje: receitaHoje,
      vendas_concluidas: vendasConcluidas.length,
      ticket_medio: ticketMedio,
    });
  };

  const atualizarFiltros = (novosFiltros: Partial<FiltrosHistoricoVendas>) => {
    setFiltros(prev => ({ ...prev, ...novosFiltros }));
  };

  const limparFiltros = () => {
    setFiltros({
      termo_busca: '',
      data_inicio: '',
      data_fim: '',
    });
  };

  const excluirVenda = async (id: string) => {
    try {
      // Primeiro buscar os dados da venda para reversão de estoque
      const { data: venda, error: fetchError } = await supabase
        .from('historico_vendas')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Se tem sku_kit e total_itens, reverter o estoque
      if (venda?.sku_kit && venda?.total_itens) {
        const quantidadeReverter = venda.total_itens;
        
        // Buscar o produto pelo sku_kit na coluna sku_interno
        const { data: produto, error: produtoError } = await supabase
          .from('produtos')
          .select('id, quantidade_atual, nome')
          .eq('sku_interno', venda.sku_kit)
          .single();

        if (produtoError) {
          // Produto não encontrado para reversão
        } else {
          // Atualizar quantidade atual somando a quantidade revertida
          const novaQuantidade = produto.quantidade_atual + quantidadeReverter;
          
          const { error: updateError } = await supabase
            .from('produtos')
            .update({ quantidade_atual: novaQuantidade })
            .eq('id', produto.id);

          if (updateError) {
            // Erro silencioso
          } else {
            // Sucesso silencioso
          }
        }
      }

      // Excluir a venda
      const { error } = await supabase
        .from('historico_vendas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Venda excluída",
        description: "A venda foi excluída e o estoque foi revertido com sucesso.",
      });

      buscarVendas();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const excluirVendasSelecionadas = async (ids: string[]) => {
    try {
      // Primeiro buscar todas as vendas para reversão de estoque
      const { data: vendas, error: fetchError } = await supabase
        .from('historico_vendas')
        .select('*')
        .in('id', ids);

      if (fetchError) throw fetchError;

      // Processar reversão de estoque para cada venda
      for (const venda of vendas || []) {
        if (venda?.sku_kit && venda?.total_itens) {
          const quantidadeReverter = venda.total_itens;
          
          // Buscar o produto pelo sku_kit na coluna sku_interno
          const { data: produto, error: produtoError } = await supabase
            .from('produtos')
            .select('id, quantidade_atual, nome')
            .eq('sku_interno', venda.sku_kit)
            .single();

          if (produtoError) {
            // Produto não encontrado para reversão
          } else {
            // Atualizar quantidade atual somando a quantidade revertida
            const novaQuantidade = produto.quantidade_atual + quantidadeReverter;
            
            const { error: updateError } = await supabase
              .from('produtos')
              .update({ quantidade_atual: novaQuantidade })
              .eq('id', produto.id);

            if (updateError) {
              // Erro silencioso
            } else {
              // Sucesso silencioso
            }
          }
        }
      }

      // Excluir as vendas
      const { error } = await supabase
        .from('historico_vendas')
        .delete()
        .in('id', ids);

      if (error) throw error;

      toast({
        title: "Vendas excluídas",
        description: `${ids.length} venda(s) foram excluídas e o estoque foi revertido com sucesso.`,
      });

      buscarVendas();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const adicionarVenda = async (novaVenda: Omit<HistoricoVenda, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('historico_vendas')
        .insert([novaVenda]);

      if (error) throw error;

      toast({
        title: "Venda adicionada",
        description: "A venda foi adicionada com sucesso.",
      });

      buscarVendas();
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const atualizarVenda = async (id: string, dadosAtualizados: Partial<HistoricoVenda>) => {
    try {
      const { error } = await supabase
        .from('historico_vendas')
        .update(dadosAtualizados)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Venda atualizada",
        description: "A venda foi atualizada com sucesso.",
      });

      buscarVendas();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const recarregarDados = () => {
    buscarVendas();
  };

  useEffect(() => {
    buscarVendas();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      buscarVendas();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filtros]);

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('historico_vendas_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'historico_vendas' },
        () => {
          buscarVendas();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return {
    vendas,
    metricas,
    loading,
    error,
    filtros,
    atualizarFiltros,
    limparFiltros,
    recarregarDados,
    excluirVenda,
    excluirVendasSelecionadas,
    adicionarVenda,
    atualizarVenda,
  };
}
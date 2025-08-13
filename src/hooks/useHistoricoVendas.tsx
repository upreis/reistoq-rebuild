import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FEATURES } from '@/config/features';

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

  // ---- EXCLUIR UMA VENDA ----
  const excluirVenda = async (id: string) => {
    try {
      // Se a UI não deve mutar, apenas avise e saia (evita side-effects em produção)
      if (!FEATURES.VENDAS_MUTATE_UI) {
        toast({
          title: "Ação desabilitada",
          description: "Exclusão de vendas pela UI está desligada.",
        });
        return;
      }

      // (Opcional) reversão de estoque do SKU-kit — mantenha somente se você usa isso hoje
      // Carrega a venda necessária para reverter a quantidade, se aplicável
      const { data: venda, error: vendaErr } = await supabase
        .from("historico_vendas")
        .select("id, sku_kit, total_itens")
        .eq("id", id)
        .single();
      if (vendaErr) throw vendaErr;

      if (venda?.sku_kit && Number(venda.total_itens) > 0) {
        const quantidadeReverter = Number(venda.total_itens);

        const { data: produto, error: produtoError } = await supabase
          .from("produtos")
          .select("id, quantidade_atual, nome")
          .eq("sku_interno", venda.sku_kit)
          .single();
        if (produtoError) throw produtoError;

        const novaQuantidade = Number(produto.quantidade_atual ?? 0) + quantidadeReverter;

        const { error: updateError } = await supabase
          .from("produtos")
          .update({ quantidade_atual: novaQuantidade })
          .eq("id", produto.id);
        if (updateError) throw updateError;
      }

      // 🔒 Deletar via RPC (não tocar a tabela diretamente)
      const { error } = await supabase.rpc("hv_delete", { _id: id });
      if (error) throw error;

      await buscarVendas();
      toast({ title: "Venda excluída com sucesso" });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error?.message ?? String(error),
        variant: "destructive",
      });
    }
  };

  // ---- EXCLUIR VÁRIAS VENDAS ----
  const excluirVendasSelecionadas = async (ids: string[]) => {
    try {
      if (!FEATURES.VENDAS_MUTATE_UI) {
        toast({
          title: "Ação desabilitada",
          description: "Exclusão de vendas pela UI está desligada.",
        });
        return;
      }

      const { error } = await supabase.rpc("hv_delete_many", { _ids: ids });
      if (error) throw error;

      await buscarVendas();
      toast({ title: "Vendas excluídas" });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir selecionadas",
        description: error?.message ?? String(error),
        variant: "destructive",
      });
    }
  };

  const adicionarVenda = async (novaVenda: Omit<HistoricoVenda, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (!FEATURES.VENDAS_MUTATE_UI) {
        toast({ 
          title: "Operação não permitida", 
          description: "Adição de vendas desabilitada por segurança", 
          variant: "destructive" 
        });
        return;
      }

      // Implementar via RPC quando necessário
      toast({
        title: "Funcionalidade em desenvolvimento",
        description: "Adição de vendas será implementada via RPC.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar",
        description: error?.message ?? String(error),
        variant: "destructive",
      });
    }
  };

  const atualizarVenda = async (id: string, dadosAtualizados: Partial<HistoricoVenda>) => {
    try {
      if (!FEATURES.VENDAS_MUTATE_UI) {
        toast({ 
          title: "Operação não permitida", 
          description: "Edição de vendas desabilitada por segurança", 
          variant: "destructive" 
        });
        return;
      }

      // Implementar via RPC quando necessário
      toast({
        title: "Funcionalidade em desenvolvimento",
        description: "Atualização de vendas será implementada via RPC.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error?.message ?? String(error),
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
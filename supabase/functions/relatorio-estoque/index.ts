import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuração do Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
let supabase = createClient(supabaseUrl, supabaseAnonKey);

interface RelatorioRequest {
  tipo: 'estoque_baixo' | 'movimentacoes' | 'valor_estoque' | 'produtos_inativos';
  dataInicio?: string;
  dataFim?: string;
  categoria?: string;
}

const gerarRelatorioEstoqueBaixo = async (categoria?: string) => {
  let query = supabase
    .from('produtos')
    .select('id, sku_interno, nome, categoria, quantidade_atual, estoque_minimo, preco_custo, localizacao')
    .eq('ativo', true)
    .or('quantidade_atual.eq.0,quantidade_atual.lte.estoque_minimo');

  if (categoria) {
    query = query.eq('categoria', categoria);
  }

  const { data: produtos, error } = await query.order('quantidade_atual', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar produtos em estoque baixo: ${error.message}`);
  }

  const produtosCriticos = produtos?.filter(p => p.quantidade_atual === 0) || [];
  const produtosBaixos = produtos?.filter(p => p.quantidade_atual > 0 && p.quantidade_atual <= p.estoque_minimo) || [];

  const valorTotalCritico = produtosCriticos.reduce((total, produto) => {
    return total + ((produto.preco_custo || 0) * produto.quantidade_atual);
  }, 0);

  const valorTotalBaixo = produtosBaixos.reduce((total, produto) => {
    return total + ((produto.preco_custo || 0) * produto.quantidade_atual);
  }, 0);

  return {
    resumo: {
      totalProdutosCriticos: produtosCriticos.length,
      totalProdutosBaixos: produtosBaixos.length,
      valorTotalCritico,
      valorTotalBaixo,
      valorTotalAfetado: valorTotalCritico + valorTotalBaixo
    },
    produtos: {
      criticos: produtosCriticos,
      baixos: produtosBaixos
    },
    categoria: categoria || 'Todas',
    dataGeracao: new Date().toISOString()
  };
};

const gerarRelatorioMovimentacoes = async (dataInicio?: string, dataFim?: string, categoria?: string) => {
  let query = supabase
    .from('movimentacoes_estoque')
    .select(`
      *,
      produtos (
        nome,
        sku_interno,
        categoria,
        preco_custo
      )
    `)
    .order('created_at', { ascending: false });

  if (dataInicio) {
    query = query.gte('created_at', dataInicio);
  }
  if (dataFim) {
    query = query.lte('created_at', dataFim);
  }

  const { data: movimentacoes, error } = await query;

  if (error) {
    throw new Error(`Erro ao buscar movimentações: ${error.message}`);
  }

  // Filtrar por categoria se especificada
  const movimentacoesFiltradas = categoria 
    ? movimentacoes?.filter(m => m.produtos?.categoria === categoria) || []
    : movimentacoes || [];

  const entradas = movimentacoesFiltradas.filter(m => m.tipo_movimentacao === 'entrada');
  const saidas = movimentacoesFiltradas.filter(m => m.tipo_movimentacao === 'saida');

  const totalEntradas = entradas.reduce((total, mov) => total + mov.quantidade_movimentada, 0);
  const totalSaidas = saidas.reduce((total, mov) => total + mov.quantidade_movimentada, 0);

  const valorTotalEntradas = entradas.reduce((total, mov) => {
    const precoCusto = mov.produtos?.preco_custo || 0;
    return total + (precoCusto * mov.quantidade_movimentada);
  }, 0);

  const valorTotalSaidas = saidas.reduce((total, mov) => {
    const precoCusto = mov.produtos?.preco_custo || 0;
    return total + (precoCusto * mov.quantidade_movimentada);
  }, 0);

  // Agrupar por motivo
  const motivosEntrada = entradas.reduce((acc: any, mov) => {
    const motivo = mov.motivo || 'Não informado';
    acc[motivo] = (acc[motivo] || 0) + mov.quantidade_movimentada;
    return acc;
  }, {});

  const motivosSaida = saidas.reduce((acc: any, mov) => {
    const motivo = mov.motivo || 'Não informado';
    acc[motivo] = (acc[motivo] || 0) + mov.quantidade_movimentada;
    return acc;
  }, {});

  return {
    resumo: {
      totalMovimentacoes: movimentacoesFiltradas.length,
      totalEntradas,
      totalSaidas,
      saldoMovimentacao: totalEntradas - totalSaidas,
      valorTotalEntradas,
      valorTotalSaidas,
      valorSaldoMovimentacao: valorTotalEntradas - valorTotalSaidas
    },
    detalhamento: {
      entradas: {
        total: entradas.length,
        quantidade: totalEntradas,
        valor: valorTotalEntradas,
        motivosDetalhados: motivosEntrada
      },
      saidas: {
        total: saidas.length,
        quantidade: totalSaidas,
        valor: valorTotalSaidas,
        motivosDetalhados: motivosSaida
      }
    },
    movimentacoes: movimentacoesFiltradas.slice(0, 100), // Limitar a 100 para performance
    filtros: {
      dataInicio: dataInicio || 'Não especificada',
      dataFim: dataFim || 'Não especificada',
      categoria: categoria || 'Todas'
    },
    dataGeracao: new Date().toISOString()
  };
};

const gerarRelatorioValorEstoque = async (categoria?: string) => {
  let query = supabase
    .from('produtos')
    .select('id, sku_interno, nome, categoria, quantidade_atual, preco_custo, preco_venda')
    .eq('ativo', true);

  if (categoria) {
    query = query.eq('categoria', categoria);
  }

  const { data: produtos, error } = await query.order('categoria');

  if (error) {
    throw new Error(`Erro ao buscar produtos para relatório de valor: ${error.message}`);
  }

  const valorTotalCusto = produtos?.reduce((total, produto) => {
    return total + ((produto.preco_custo || 0) * produto.quantidade_atual);
  }, 0) || 0;

  const valorTotalVenda = produtos?.reduce((total, produto) => {
    return total + ((produto.preco_venda || 0) * produto.quantidade_atual);
  }, 0) || 0;

  const margemLucro = valorTotalVenda - valorTotalCusto;
  const percentualMargem = valorTotalCusto > 0 ? ((margemLucro / valorTotalCusto) * 100) : 0;

  // Agrupar por categoria
  const valorPorCategoria = produtos?.reduce((acc: any, produto) => {
    const cat = produto.categoria || 'Sem categoria';
    if (!acc[cat]) {
      acc[cat] = {
        quantidade: 0,
        valorCusto: 0,
        valorVenda: 0,
        produtos: 0
      };
    }
    acc[cat].quantidade += produto.quantidade_atual;
    acc[cat].valorCusto += (produto.preco_custo || 0) * produto.quantidade_atual;
    acc[cat].valorVenda += (produto.preco_venda || 0) * produto.quantidade_atual;
    acc[cat].produtos += 1;
    return acc;
  }, {}) || {};

  return {
    resumo: {
      totalProdutos: produtos?.length || 0,
      quantidadeTotal: produtos?.reduce((total, produto) => total + produto.quantidade_atual, 0) || 0,
      valorTotalCusto,
      valorTotalVenda,
      margemLucro,
      percentualMargem
    },
    categorias: Object.entries(valorPorCategoria).map(([categoria, dados]: [string, any]) => ({
      categoria,
      ...dados,
      margemCategoria: dados.valorVenda - dados.valorCusto,
      percentualMargemCategoria: dados.valorCusto > 0 ? ((dados.valorVenda - dados.valorCusto) / dados.valorCusto) * 100 : 0
    })),
    produtosMaiorValor: produtos
      ?.map(produto => ({
        ...produto,
        valorTotalCusto: (produto.preco_custo || 0) * produto.quantidade_atual,
        valorTotalVenda: (produto.preco_venda || 0) * produto.quantidade_atual
      }))
      ?.sort((a, b) => b.valorTotalCusto - a.valorTotalCusto)
      ?.slice(0, 10) || [],
    categoria: categoria || 'Todas',
    dataGeracao: new Date().toISOString()
  };
};

const gerarRelatorioProdutosInativos = async () => {
  const { data: produtos, error } = await supabase
    .from('produtos')
    .select('id, sku_interno, nome, categoria, quantidade_atual, preco_custo, created_at, updated_at')
    .eq('ativo', false)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar produtos inativos: ${error.message}`);
  }

  const valorTotalInativo = produtos?.reduce((total, produto) => {
    return total + ((produto.preco_custo || 0) * produto.quantidade_atual);
  }, 0) || 0;

  const quantidadeTotal = produtos?.reduce((total, produto) => total + produto.quantidade_atual, 0) || 0;

  return {
    resumo: {
      totalProdutosInativos: produtos?.length || 0,
      quantidadeTotalInativa: quantidadeTotal,
      valorTotalInativo
    },
    produtos: produtos || [],
    dataGeracao: new Date().toISOString()
  };
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { 
          status: 405, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Recriar o client autenticado pelo usuário (RLS aplicado)
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('authorization') || '' } },
    });

    const body: RelatorioRequest = await req.json();
    const { tipo, dataInicio, dataFim, categoria } = body;

    console.log(`Gerando relatório do tipo: ${tipo}`, { dataInicio, dataFim, categoria });

    let relatorio;

    switch (tipo) {
      case 'estoque_baixo':
        relatorio = await gerarRelatorioEstoqueBaixo(categoria);
        break;
      case 'movimentacoes':
        relatorio = await gerarRelatorioMovimentacoes(dataInicio, dataFim, categoria);
        break;
      case 'valor_estoque':
        relatorio = await gerarRelatorioValorEstoque(categoria);
        break;
      case 'produtos_inativos':
        relatorio = await gerarRelatorioProdutosInativos();
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Tipo de relatório não reconhecido' }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
    }

    console.log(`Relatório ${tipo} gerado com sucesso`);

    return new Response(
      JSON.stringify({
        sucesso: true,
        tipo,
        relatorio
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Erro ao gerar relatório:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
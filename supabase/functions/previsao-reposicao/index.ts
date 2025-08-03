import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuração
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface PrevisaoRequest {
  produto_id?: string;
  dias_analise?: number;
  incluir_sazonalidade?: boolean;
}

interface PrevisaoResposta {
  produto: {
    id: string;
    nome: string;
    sku_interno: string;
    estoque_atual: number;
    estoque_minimo: number;
  };
  analise: {
    consumo_medio_diario: number;
    tendencia: 'crescente' | 'estavel' | 'decrescente';
    sazonalidade: string;
    variabilidade: 'alta' | 'media' | 'baixa';
  };
  previsao: {
    dias_para_esgotar: number;
    data_prevista_esgotamento: string;
    quantidade_sugerida_compra: number;
    data_sugerida_compra: string;
    confianca_percentual: number;
  };
  recomendacoes: string[];
  ia_insights: string;
}

const analisarProdutoComIA = async (produto: any, movimentacoes: any[], consumoMedio: number) => {
  if (!openAIApiKey) {
    return {
      insights: "IA indisponível - análise baseada em dados históricos apenas.",
      recomendacoes: [
        "Configure a chave da OpenAI para análises mais avançadas",
        "Monitore o consumo manualmente"
      ]
    };
  }

  try {
    // Preparar dados para a IA
    const dadosAnalise = {
      produto: {
        nome: produto.nome,
        sku: produto.sku_interno,
        categoria: produto.categoria,
        estoque_atual: produto.quantidade_atual,
        estoque_minimo: produto.estoque_minimo,
        preco_custo: produto.preco_custo,
        preco_venda: produto.preco_venda
      },
      historico: {
        movimentacoes_ultimos_30_dias: movimentacoes.length,
        consumo_medio_diario: consumoMedio,
        maior_saida_dia: Math.max(...movimentacoes.filter(m => m.tipo_movimentacao === 'saida').map(m => m.quantidade_movimentada), 0),
        entradas_recentes: movimentacoes.filter(m => m.tipo_movimentacao === 'entrada').length,
        saidas_recentes: movimentacoes.filter(m => m.tipo_movimentacao === 'saida').length
      }
    };

    const prompt = `
Você é um especialista em gestão de estoque e análise de dados. Analise os seguintes dados de um produto e forneça insights inteligentes para reposição:

DADOS DO PRODUTO:
${JSON.stringify(dadosAnalise, null, 2)}

Por favor, forneça uma análise detalhada considerando:

1. PADRÃO DE CONSUMO: Analise o padrão de saídas e identifique tendências
2. SAZONALIDADE: Identifique possíveis padrões sazonais ou cíclicos
3. VARIABILIDADE: Avalie a previsibilidade do consumo
4. RISCOS: Identifique riscos de ruptura ou sobrestoque
5. OPORTUNIDADES: Sugira melhorias na gestão do produto

FORMATO DE RESPOSTA (JSON):
{
  "insights": "Análise detalhada do comportamento do produto em 2-3 parágrafos",
  "tendencia": "crescente|estavel|decrescente",
  "sazonalidade": "descrição dos padrões sazonais identificados",
  "variabilidade": "alta|media|baixa",
  "recomendacoes": [
    "recomendação 1",
    "recomendação 2",
    "recomendação 3"
  ],
  "quantidade_sugerida": "número baseado na análise",
  "confianca": "percentual de 0-100"
}

Seja específico e prático nas recomendações. Considere fatores como lead time de fornecedores, sazonalidade do negócio e margem de segurança.
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em gestão de estoque com 20 anos de experiência em análise preditiva e otimização de inventário.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const analiseIA = data.choices[0].message.content;
    
    // Tentar parsear como JSON, senão usar como texto
    try {
      return JSON.parse(analiseIA);
    } catch {
      return {
        insights: analiseIA,
        tendencia: 'estavel',
        sazonalidade: 'Análise em andamento',
        variabilidade: 'media',
        recomendacoes: ['Revisar dados históricos', 'Monitorar consumo'],
        quantidade_sugerida: Math.max(produto.estoque_minimo * 2, 10),
        confianca: 75
      };
    }
  } catch (error) {
    console.error('Erro na análise com IA:', error);
    return {
      insights: "Erro na análise IA - usando análise baseada em dados históricos.",
      tendencia: 'estavel',
      sazonalidade: 'Não identificada',
      variabilidade: 'media',
      recomendacoes: [
        "Verificar conectividade com IA",
        "Continuar monitoramento manual"
      ],
      quantidade_sugerida: produto.estoque_minimo * 2,
      confianca: 60
    };
  }
};

const calcularPrevisaoReposicao = async (produtoId: string, diasAnalise: number = 30) => {
  try {
    // Buscar dados do produto
    const { data: produto, error: produtoError } = await supabase
      .from('produtos')
      .select('*')
      .eq('id', produtoId)
      .single();

    if (produtoError || !produto) {
      throw new Error('Produto não encontrado');
    }

    // Buscar movimentações recentes
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - diasAnalise);

    const { data: movimentacoes, error: movError } = await supabase
      .from('movimentacoes_estoque')
      .select('*')
      .eq('produto_id', produtoId)
      .gte('created_at', dataInicio.toISOString())
      .order('created_at', { ascending: false });

    if (movError) {
      throw movError;
    }

    // Calcular métricas básicas
    const saidasRecentes = movimentacoes?.filter(m => m.tipo_movimentacao === 'saida') || [];
    const entradasRecentes = movimentacoes?.filter(m => m.tipo_movimentacao === 'entrada') || [];
    
    const totalSaidas = saidasRecentes.reduce((total, m) => total + m.quantidade_movimentada, 0);
    const totalEntradas = entradasRecentes.reduce((total, m) => total + m.quantidade_movimentada, 0);
    
    const consumoMedioDiario = totalSaidas / diasAnalise;
    const entradaMediaDiaria = totalEntradas / diasAnalise;

    // Análise de tendência
    const metadeRecente = Math.floor(saidasRecentes.length / 2);
    const saidasRecentes1 = saidasRecentes.slice(0, metadeRecente);
    const saidasRecentes2 = saidasRecentes.slice(metadeRecente);
    
    const consumoRecente = saidasRecentes1.reduce((total, m) => total + m.quantidade_movimentada, 0) / (metadeRecente || 1);
    const consumoAntigo = saidasRecentes2.reduce((total, m) => total + m.quantidade_movimentada, 0) / (saidasRecentes2.length || 1);
    
    let tendencia: 'crescente' | 'estavel' | 'decrescente' = 'estavel';
    if (consumoRecente > consumoAntigo * 1.1) {
      tendencia = 'crescente';
    } else if (consumoRecente < consumoAntigo * 0.9) {
      tendencia = 'decrescente';
    }

    // Calcular variabilidade
    const desvios = saidasRecentes.map(m => Math.abs(m.quantidade_movimentada - consumoMedioDiario));
    const desvioMedio = desvios.reduce((a, b) => a + b, 0) / (desvios.length || 1);
    const coeficienteVariacao = consumoMedioDiario > 0 ? desvioMedio / consumoMedioDiario : 0;
    
    let variabilidade: 'alta' | 'media' | 'baixa' = 'media';
    if (coeficienteVariacao > 0.5) {
      variabilidade = 'alta';
    } else if (coeficienteVariacao < 0.2) {
      variabilidade = 'baixa';
    }

    // Análise com IA
    const analiseIA = await analisarProdutoComIA(produto, movimentacoes || [], consumoMedioDiario);

    // Cálculos de previsão
    const diasParaEsgotar = consumoMedioDiario > 0 ? produto.quantidade_atual / consumoMedioDiario : 999;
    const dataEsgotamento = new Date();
    dataEsgotamento.setDate(dataEsgotamento.getDate() + Math.floor(diasParaEsgotar));

    // Lead time padrão (pode ser configurável)
    const leadTimeDias = 7;
    const margemSeguranca = variabilidade === 'alta' ? 2 : variabilidade === 'media' ? 1.5 : 1.2;
    
    const quantidadeSugerida = Math.max(
      Math.ceil(consumoMedioDiario * leadTimeDias * margemSeguranca),
      produto.estoque_minimo,
      analiseIA.quantidade_sugerida || 0
    );

    const dataComprasSugerida = new Date();
    dataComprasSugerida.setDate(dataComprasSugerida.getDate() + Math.max(0, diasParaEsgotar - leadTimeDias - 2));

    // Recomendações baseadas na análise
    const recomendacoes = [...(analiseIA.recomendacoes || [])];
    
    if (diasParaEsgotar < 7) {
      recomendacoes.unshift('🚨 URGENTE: Produto pode esgotar em menos de 7 dias!');
    } else if (diasParaEsgotar < 14) {
      recomendacoes.unshift('⚠️ ATENÇÃO: Considere fazer pedido de reposição em breve');
    }

    if (tendencia === 'crescente') {
      recomendacoes.push('📈 Consumo em alta - considere aumentar estoque de segurança');
    }

    if (variabilidade === 'alta') {
      recomendacoes.push('📊 Alta variabilidade - monitore mais frequentemente');
    }

    const resultado: PrevisaoResposta = {
      produto: {
        id: produto.id,
        nome: produto.nome,
        sku_interno: produto.sku_interno,
        estoque_atual: produto.quantidade_atual,
        estoque_minimo: produto.estoque_minimo
      },
      analise: {
        consumo_medio_diario: Math.round(consumoMedioDiario * 100) / 100,
        tendencia,
        sazonalidade: analiseIA.sazonalidade || 'Não identificada',
        variabilidade
      },
      previsao: {
        dias_para_esgotar: Math.round(diasParaEsgotar),
        data_prevista_esgotamento: dataEsgotamento.toISOString().split('T')[0],
        quantidade_sugerida_compra: quantidadeSugerida,
        data_sugerida_compra: dataComprasSugerida.toISOString().split('T')[0],
        confianca_percentual: analiseIA.confianca || 80
      },
      recomendacoes,
      ia_insights: analiseIA.insights || 'Análise baseada em dados históricos'
    };

    return resultado;
  } catch (error) {
    console.error('Erro ao calcular previsão:', error);
    throw error;
  }
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

    const body: PrevisaoRequest = await req.json();
    const { produto_id, dias_analise = 30 } = body;

    if (!produto_id) {
      return new Response(
        JSON.stringify({ error: 'produto_id é obrigatório' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    console.log(`Calculando previsão para produto ${produto_id} (${dias_analise} dias)`);

    const previsao = await calcularPrevisaoReposicao(produto_id, dias_analise);

    console.log('Previsão calculada com sucesso');

    return new Response(
      JSON.stringify({
        sucesso: true,
        previsao
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Erro ao calcular previsão de reposição:', error);
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
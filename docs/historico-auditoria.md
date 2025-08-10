# Auditoria – Histórico de Pedidos Baixados

Resumo das causas raiz e correções aplicadas para: (1) flicker na página “Histórico” e (2) ausência de registros no histórico após baixa de estoque.

1) Página “Histórico” – Flicker (piscada)

Causas identificadas
- Flash de vazio por troca completa do conteúdo durante refetch: o hook useHistoricoVendas marcava loading=true em qualquer busca, e a tabela renderizava Skeleton em vez de manter os dados anteriores.
- Pequeno layout shift (CLS) na área da tabela ao alternar entre skeleton e tabela.

Correções
- Manter dados durante refetch: introduzido refetching no hook e loading apenas no primeiro carregamento. A tabela só mostra Skeleton quando loading && vendas.length===0, preservando dados durante atualizações.
- Estabilização visual: min-height no CardContent (min-h-[400px]) para evitar variação de altura entre estados.

Resultado esperado
- Navegar para /historico sem “piscada” perceptível, sem flash de vazio em refetch e CLS ≈ 0 no container principal.

Arquivos alterados
- src/hooks/useHistoricoVendas.tsx: adicionados useRef/isFirstLoad, refetching e ajuste de fluxo de loading.
- src/components/historico/HistoricoVendasTabela.tsx: Skeleton apenas quando não há dados; min-height no conteúdo.

2) Histórico não gravava após baixa

Causa identificada
- RLS em historico_vendas exige integration_account_id válido e associado à organização. Em alguns cenários o insert era feito sem esse campo (ou com null), fazendo com que os registros não fossem visíveis ao usuário, apesar de a baixa no estoque ocorrer.

Correção
- Edge Function processar-baixa-estoque passou a preencher integration_account_id a partir de (nessa ordem):
  1) item.integration_account_id (enviado pelo front);
  2) produto.integration_account_id (novo campo retornado na query do produto).
- Assim os inserts passam pelas políticas RLS e aparecem na página “Histórico”.

Resultado esperado
- Ao processar a baixa, um registro correspondente surge em historico_vendas (com id_unico, status, timestamps) sem duplicidade.

Arquivos alterados
- supabase/functions/processar-baixa-estoque/index.ts: select do produto inclui integration_account_id; insert em historico_vendas usa fallback (item || produto).

Testes e checklist
- Novo registro: processar 1 pedido mapeado → registro aparece em /historico; sem erros no console.
- Duplicado: reenviar o mesmo item → ignorado por id_unico.
- Sem permissão: se desconectar/alterar organização, registros não devem aparecer (RLS).
- UX: ao filtrar datas/termos, dados anteriores permanecem na tela até novo resultado.

Notas futuras (opcional)
- Paralelizar a baixa (Promise.allSettled com limite de concorrência) para reduzir tempo total de lotes grandes. Em item único, o ganho é marginal; em lotes grandes costuma cair de dezenas de segundos para 1–3s.

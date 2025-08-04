-- Corrigir configurações e unificar duplicatas
UPDATE configuracoes SET 
  valor = '{"em aberto": "em_aberto", "aprovado": "aprovado", "preparando envio": "preparando_envio", "faturado": "faturado", "enviado": "enviado", "entregue": "entregue", "cancelado": "cancelado"}',
  descricao = 'Mapeamento CORRETO: Sistema → Tiny ERP (para envio de filtros)'
WHERE chave = 'situacoes_mapeamento';

-- Configurar situações baseadas nos dados REAIS
UPDATE configuracoes SET 
  valor = '["entregue", "cancelado"]',
  descricao = 'Situações que realmente existem no banco de dados'
WHERE chave = 'situacoes_validas_tiny';

-- Remover duplicação do token
DELETE FROM configuracoes WHERE chave = 'tiny_token';

-- Padronizar formato
UPDATE configuracoes SET valor = 'json' WHERE chave = 'tiny_erp_formato';

-- Adicionar configuração para buscar TODOS os dados
INSERT INTO configuracoes (chave, valor, descricao, tipo) VALUES
('buscar_todos_pedidos', 'true', 'Se true, busca todos os pedidos independente de filtro de data', 'boolean'),
('data_inicio_sistema', '2020-01-01', 'Data mínima para buscar pedidos (para pegar histórico completo)', 'string')
ON CONFLICT (chave) DO UPDATE SET 
  valor = EXCLUDED.valor,
  descricao = EXCLUDED.descricao;
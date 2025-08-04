-- Fase 1: Correção das Configurações da Integração Tiny ERP

-- 1. Corrigir chave inconsistente de tiny_erp_url para tiny_api_url
UPDATE configuracoes 
SET chave = 'tiny_api_url' 
WHERE chave = 'tiny_erp_url';

-- 2. Adicionar configurações de robustez faltantes para produção
INSERT INTO configuracoes (chave, valor, descricao, tipo) VALUES
('tiny_timeout_segundos', '30', 'Timeout em segundos para requisições à API Tiny ERP', 'integer'),
('tiny_max_tentativas', '3', 'Número máximo de tentativas em caso de falha na API', 'integer'), 
('tiny_items_por_pagina', '20', 'Quantidade de itens por página na sincronização', 'integer'),
('tiny_sync_ativo', 'true', 'Ativar/desativar sincronização automática com Tiny ERP', 'boolean'),
('tiny_delay_entre_requisicoes', '2000', 'Delay em milissegundos entre requisições (rate limit)', 'integer'),
('tiny_max_falhas_consecutivas', '3', 'Máximo de falhas consecutivas antes de abortar', 'integer')
ON CONFLICT (chave) DO UPDATE SET
valor = EXCLUDED.valor,
descricao = EXCLUDED.descricao,
tipo = EXCLUDED.tipo,
updated_at = now();
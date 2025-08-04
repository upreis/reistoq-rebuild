-- Configurações completas para integração Tiny ERP
INSERT INTO configuracoes (chave, valor, descricao, tipo) VALUES
-- Configurações de timeout e retry
('tiny_timeout_segundos', '30', 'Timeout em segundos para requisições à API Tiny', 'number'),
('tiny_max_tentativas', '3', 'Máximo de tentativas de retry por requisição', 'number'),
('tiny_delay_entre_requisicoes', '500', 'Delay em ms entre requisições (rate limit)', 'number'),
('tiny_max_falhas_consecutivas', '3', 'Máximo de falhas consecutivas antes de parar', 'number'),

-- Mapeamento de situações (Tiny ERP → Sistema)
('situacoes_mapeamento', '{"em_aberto": "em aberto", "aprovado": "aprovado", "preparando_envio": "preparando envio", "faturado": "faturado", "enviado": "enviado", "entregue": "entregue", "cancelado": "cancelado"}', 'Mapeamento de situações entre Tiny ERP e sistema interno', 'json'),

-- Situações válidas para filtros
('situacoes_validas_tiny', '["em_aberto", "aprovado", "preparando_envio", "faturado", "enviado", "entregue", "cancelado"]', 'Lista de situações válidas na API Tiny ERP', 'json'),

-- Configurações de sincronização
('sync_max_paginas_execucao', '10', 'Máximo de páginas processadas por execução', 'number'),
('sync_intervalo_pedidos_segundos', '3600', 'Intervalo entre sincronizações automáticas de pedidos (segundos)', 'number')

ON CONFLICT (chave) DO UPDATE SET 
  valor = EXCLUDED.valor,
  descricao = EXCLUDED.descricao,
  tipo = EXCLUDED.tipo,
  updated_at = now();
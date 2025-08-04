-- Adicionar configurações para alertas automáticos
INSERT INTO public.configuracoes (chave, valor, descricao, tipo) VALUES
('alertas_automaticos', 'false', 'Ativar alertas automáticos de estoque', 'boolean'),
('intervalo_alertas', '60', 'Intervalo dos alertas automáticos em minutos (0 = tempo real)', 'integer')
ON CONFLICT (chave) DO UPDATE SET
valor = EXCLUDED.valor,
descricao = EXCLUDED.descricao,
tipo = EXCLUDED.tipo;

-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
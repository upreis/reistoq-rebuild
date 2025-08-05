-- Adicionar configurações da URL da API Tiny
INSERT INTO public.configuracoes (chave, valor, descricao) VALUES 
('tiny_api_url', 'https://api.tiny.com.br/api2', 'URL base da API do Tiny ERP'),
('tiny_token', '', 'Token de acesso da API Tiny ERP (deve ser configurado pelo usuário)')
ON CONFLICT (chave) DO UPDATE SET 
  valor = EXCLUDED.valor,
  descricao = EXCLUDED.descricao;
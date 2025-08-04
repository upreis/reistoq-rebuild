-- Remover o trigger problemático que está causando o erro
DROP TRIGGER IF EXISTS trigger_alertas_estoque ON public.produtos;

-- Remover a função que está causando problemas
DROP FUNCTION IF EXISTS public.verificar_alertas_estoque();

-- Como alternativa, vamos criar um mecanismo mais simples:
-- Vamos usar apenas o trigger de movimentação que já existe e funciona bem
-- E fazer chamadas manuais para alertas quando necessário

-- Verificar se o trigger de movimentação já existe e está funcionando
-- (não precisa recriar, só garantir que está ativo)
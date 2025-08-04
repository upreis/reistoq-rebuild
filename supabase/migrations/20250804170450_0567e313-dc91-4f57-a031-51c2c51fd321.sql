-- Corrigir produtos existentes: marcar como ativos
UPDATE produtos 
SET ativo = true 
WHERE ativo = false;
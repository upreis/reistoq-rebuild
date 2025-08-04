-- Mover extensões para o schema extensions para seguir boas práticas de segurança
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION http SET SCHEMA extensions;
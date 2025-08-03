-- Criar bucket para imagens de produtos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('produtos-imagens', 'produtos-imagens', true);

-- Criar políticas para o bucket de imagens
CREATE POLICY "Permitir visualização pública de imagens de produtos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'produtos-imagens');

CREATE POLICY "Permitir upload de imagens de produtos para usuários autenticados" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'produtos-imagens' AND auth.role() = 'authenticated');

CREATE POLICY "Permitir atualização de imagens de produtos para usuários autenticados" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'produtos-imagens' AND auth.role() = 'authenticated');

CREATE POLICY "Permitir deleção de imagens de produtos para usuários autenticados" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'produtos-imagens' AND auth.role() = 'authenticated');
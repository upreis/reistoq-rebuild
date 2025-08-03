import React, { useState } from 'react';
import { Cloud, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProdutoImageUploadProps {
  produtoId: string;
  currentImageUrl?: string;
  onImageUploaded: (url: string) => void;
}

export const ProdutoImageUpload: React.FC<ProdutoImageUploadProps> = ({
  produtoId,
  currentImageUrl,
  onImageUploaded,
}) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione apenas arquivos de imagem.',
        variant: 'destructive',
      });
      return;
    }

    // Validar tamanho (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no máximo 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${produtoId}-${Date.now()}.${fileExt}`;
      const filePath = `produtos/${fileName}`;

      // Fazer upload do arquivo
      const { error: uploadError } = await supabase.storage
        .from('produtos-imagens')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL pública
      const { data } = supabase.storage
        .from('produtos-imagens')
        .getPublicUrl(filePath);

      const imageUrl = data.publicUrl;

      // Atualizar produto com nova URL da imagem
      const { error: updateError } = await supabase
        .from('produtos')
        .update({ url_imagem: imageUrl })
        .eq('id', produtoId);

      if (updateError) {
        throw updateError;
      }

      onImageUploaded(imageUrl);
      toast({
        title: 'Sucesso',
        description: 'Imagem carregada com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar imagem. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!currentImageUrl) return;

    try {
      // Extrair o caminho do arquivo da URL
      const urlParts = currentImageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `produtos/${fileName}`;

      // Remover do storage
      await supabase.storage
        .from('produtos-imagens')
        .remove([filePath]);

      // Atualizar produto removendo URL da imagem
      const { error: updateError } = await supabase
        .from('produtos')
        .update({ url_imagem: null })
        .eq('id', produtoId);

      if (updateError) {
        throw updateError;
      }

      onImageUploaded('');
      toast({
        title: 'Sucesso',
        description: 'Imagem removida com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao remover imagem:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao remover imagem. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      {currentImageUrl ? (
        <div className="flex items-center gap-2">
          <img
            src={currentImageUrl}
            alt="Produto"
            className="w-8 h-8 object-cover rounded"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleRemoveImage}
            className="text-destructive hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={uploading}
            className="text-muted-foreground hover:text-foreground"
          >
            {uploading ? (
              <Upload className="h-3 w-3 animate-spin" />
            ) : (
              <Cloud className="h-3 w-3" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
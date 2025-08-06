import React, { useState } from 'react';
import { Cloud, Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ImageUploadScannerProps {
  imageUrl?: string;
  onImageChange: (url: string) => void;
  produtoId?: string; // Para produtos existentes
}

export const ImageUploadScanner: React.FC<ImageUploadScannerProps> = ({
  imageUrl,
  onImageChange,
  produtoId,
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(imageUrl || '');
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
      // Criar preview local imediatamente
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);

      // Nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${produtoId || 'temp'}-${Date.now()}.${fileExt}`;
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

      const uploadedUrl = data.publicUrl;
      
      // Atualizar com URL real
      setPreviewUrl(uploadedUrl);
      onImageChange(uploadedUrl);

      // Se for produto existente, atualizar imediatamente no banco
      if (produtoId) {
        const { error: updateError } = await supabase
          .from('produtos')
          .update({ url_imagem: uploadedUrl })
          .eq('id', produtoId);

        if (updateError) {
          console.warn('Erro ao atualizar produto:', updateError);
        }
      }

      toast({
        title: 'Sucesso',
        description: 'Imagem carregada com sucesso!',
      });

      // Limpar preview local
      URL.revokeObjectURL(localPreview);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      setPreviewUrl(imageUrl || ''); // Reverter para imagem anterior
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
    if (!previewUrl) return;

    try {
      // Se for URL do Supabase, tentar remover do storage
      if (previewUrl.includes('produtos-imagens')) {
        const urlParts = previewUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `produtos/${fileName}`;

        await supabase.storage
          .from('produtos-imagens')
          .remove([filePath]);
      }

      // Se for produto existente, atualizar banco
      if (produtoId) {
        const { error: updateError } = await supabase
          .from('produtos')
          .update({ url_imagem: null })
          .eq('id', produtoId);

        if (updateError) {
          console.warn('Erro ao atualizar produto:', updateError);
        }
      }

      setPreviewUrl('');
      onImageChange('');

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
    <div className="space-y-2">
      <Label>Imagem do Produto</Label>
      
      {previewUrl ? (
        <div className="relative group">
          <div className="aspect-video w-full max-w-md mx-auto bg-muted rounded-lg overflow-hidden border">
            <img
              src={previewUrl}
              alt="Preview do produto"
              className="w-full h-full object-cover"
            />
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleRemoveImage}
            disabled={uploading}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            id="image-upload"
          />
          <div className="aspect-video w-full max-w-md mx-auto bg-muted rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 hover:border-muted-foreground/50 transition-colors cursor-pointer">
            {uploading ? (
              <>
                <Upload className="h-8 w-8 text-muted-foreground animate-spin" />
                <p className="text-sm text-muted-foreground">Carregando...</p>
              </>
            ) : (
              <>
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">
                  Clique ou arraste uma imagem aqui
                  <br />
                  <span className="text-xs">Máximo 5MB</span>
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
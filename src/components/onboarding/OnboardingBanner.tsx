import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function OnboardingBanner() {
  const { user, onboardingCompleto } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Don't show if onboarding is complete, user is not logged in, or banner was dismissed
  if (onboardingCompleto || !user || dismissed) {
    return null;
  }

  const handleDismiss = async () => {
    try {
      setLoading(true);
      
      // Save dismiss state to user profile
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_banner_dismissed: true })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      setDismissed(true);
      toast({
        title: "Banner ocultado",
        description: "O aviso não será mais exibido.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao ocultar banner",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSettings = () => {
    navigate('/configuracoes');
  };

  return (
    <Card className="m-4 p-4 bg-primary/5 border border-primary/20">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Complete seu cadastro para liberar todos os recursos</p>
            <p className="text-xs text-muted-foreground">Configure sua organização e integrações</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenSettings}
            className="text-xs"
          >
            Abrir configurações
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            disabled={loading}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {loading ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <>
                <X className="h-4 w-4 mr-1" />
                Não mostrar de novo
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
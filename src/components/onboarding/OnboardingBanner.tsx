import React, { useState, useEffect } from 'react';
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
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Check if banner is dismissed
  useEffect(() => {
    if (!user) return;

    const checkBannerStatus = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile && 'onboarding_banner_dismissed' in profile) {
          setBannerDismissed(profile.onboarding_banner_dismissed as boolean);
        }
      } catch (error) {
        // If field doesn't exist or query fails, show banner
        setBannerDismissed(false);
      }
    };

    checkBannerStatus();
  }, [user]);

  // Don't show if onboarding is complete, user is not logged in, or banner was dismissed
  if (onboardingCompleto || !user || dismissed || bannerDismissed) {
    return null;
  }

  const handleDismiss = async () => {
    try {
      setLoading(true);
      
      // Try to save dismiss state to user profile
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_banner_dismissed: true } as any)
        .eq('id', user.id);

      if (error) {
        // If update fails (field might not exist), just dismiss locally
        console.warn('Could not save banner dismiss state:', error);
      }

      setDismissed(true);
      setBannerDismissed(true);
      toast({
        title: "Banner ocultado",
        description: "O aviso não será mais exibido.",
      });
    } catch (error: any) {
      // Even if save fails, dismiss locally
      setDismissed(true);
      toast({
        title: "Banner ocultado",
        description: "O aviso foi ocultado localmente.",
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
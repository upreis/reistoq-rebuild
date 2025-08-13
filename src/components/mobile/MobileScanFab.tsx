import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { FEATURES } from '@/config/features';

export function MobileScanFab() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Don't render if feature flag is disabled or not on mobile
  if (!FEATURES.MOBILE_SCAN_FAB || !isMobile) {
    return null;
  }

  const handleScanClick = () => {
    // Optional haptics feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    // Navigate to scanner route
    navigate('/scanner');
  };

  return (
    <div 
      className="fixed inset-x-0 bottom-4 flex justify-center z-50 pointer-events-none pb-[env(safe-area-inset-bottom)]"
      aria-live="polite"
    >
      <Button
        onClick={handleScanClick}
        className="pointer-events-auto h-14 min-w-14 px-6 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 flex items-center gap-2"
        aria-label="Abrir scanner"
        tabIndex={0}
      >
        <ScanLine className="h-6 w-6" />
        <span className="text-sm font-medium">Scanner</span>
      </Button>
    </div>
  );
}
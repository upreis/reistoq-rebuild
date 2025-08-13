import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ScanLine } from "lucide-react";
import { FEATURE_MOBILE_SCAN_FAB } from "@/config/features";

export default function MobileScanFab() {
  const [isMobile, setIsMobile] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    const checkMobile = () => {
      // Multi-criteria mobile detection as requested
      const viewportMobile = window.innerWidth <= 768;
      const touchDevice = 'ontouchstart' in window;
      const userAgentMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
      const mobile = viewportMobile || touchDevice || userAgentMobile;
      
      setIsMobile(mobile);
      
      // Debug log
      console.log("MobileScanFab debug:", { 
        mobile, 
        viewportMobile,
        touchDevice,
        userAgentMobile,
        flag: FEATURE_MOBILE_SCAN_FAB, 
        path: loc.pathname,
        viewport: `${window.innerWidth}x${window.innerHeight}`
      });
    };
    
    const mq = window.matchMedia("(max-width: 768px)");
    mq.addEventListener?.("change", checkMobile);
    checkMobile();
    
    return () => mq.removeEventListener?.("change", checkMobile);
  }, [loc.pathname]);

  if (!FEATURE_MOBILE_SCAN_FAB || !isMobile) return null;

  // Ocultar se já estiver na tela de scanner (opcional)
  const hideOnScanner = loc.pathname.startsWith("/scanner");
  if (hideOnScanner) return null;

  const handleScanClick = () => {
    // Optional haptics feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    nav("/scanner");
  };

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center pb-[env(safe-area-inset-bottom)] pointer-events-none">
      <button
        data-testid="mobile-scan-fab"
        aria-label="Abrir scanner"
        className="pointer-events-auto h-14 min-w-14 px-6 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 flex items-center gap-2"
        onClick={handleScanClick}
      >
        <ScanLine className="h-5 w-5" />
        <span className="text-sm font-medium">Scanner</span>
      </button>
    </div>
  );
}
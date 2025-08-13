import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ScanLine } from "lucide-react";

export default function MobileScanFab() {
  const [isMobile, setIsMobile] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    const checkMobile = () => {
      // Multi-criteria mobile detection - matchMedia, touch, userAgent
      const mediaQuery = window.matchMedia('(max-width: 768px)').matches;
      const touchDevice = 'ontouchstart' in window;
      const userAgentMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
      const mobile = mediaQuery || touchDevice || userAgentMobile;
      
      setIsMobile(mobile);
      
      // FAB debug log
      console.log("FAB debug", { 
        flag: true, // VITE_FEATURE_MOBILE_SCAN_FAB=true
        width: window.innerWidth,
        ua: navigator.userAgent,
        path: loc.pathname,
        isMobile: mobile
      });
    };
    
    const mq = window.matchMedia("(max-width: 768px)");
    mq.addEventListener?.("change", checkMobile);
    checkMobile();
    
    return () => mq.removeEventListener?.("change", checkMobile);
  }, [loc.pathname]);

  if (!isMobile) return null;

  // Ocultar apenas em /scanner (comparação exata)
  if (loc.pathname === "/scanner") return null;

  const handleScanClick = () => {
    // Optional haptics feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    nav("/scanner");
  };

  return (
    <div className="fixed inset-x-0 bottom-4 flex justify-center z-50 pointer-events-none pb-[env(safe-area-inset-bottom)]">
      <button
        data-testid="mobile-scan-fab"
        aria-label="Abrir scanner"
        className="pointer-events-auto h-14 min-w-14 px-6 rounded-full shadow-lg bg-primary text-primary-foreground flex items-center gap-2"
        onClick={handleScanClick}
      >
        <ScanLine className="h-5 w-5" />
        <span className="text-sm font-medium">Scanner</span>
      </button>
    </div>
  );
}
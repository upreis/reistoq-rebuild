import { useState, useEffect } from "react";
import { ScanLine } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export default function FabDebug() {
  const [forceFab, setForceFab] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();

  const handleScanClick = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    nav("/scanner");
  };

  useEffect(() => {
    // Force log FAB debug info for /_fab-debug page
    console.log("FAB debug", { 
      flag: true,
      width: window.innerWidth,
      ua: navigator.userAgent,
      path: loc.pathname,
      isMobile: window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window || /Android|iPhone|iPad/i.test(navigator.userAgent)
    });
  }, [loc.pathname]);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">FAB Debug Page</h1>
      
      <div className="space-y-4">
        <button
          onClick={() => setForceFab(!forceFab)}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded"
        >
          {forceFab ? 'Hide' : 'Show'} Force FAB
        </button>
        
        <div className="p-4 bg-muted rounded">
          <h3 className="font-semibold mb-2">Device Info:</h3>
          <p>Viewport: {window.innerWidth}x{window.innerHeight}</p>
          <p>Touch: {'ontouchstart' in window ? 'Yes' : 'No'}</p>
          <p>User Agent: {navigator.userAgent}</p>
          <p>MediaQuery Match: {window.matchMedia('(max-width: 768px)').matches ? 'Yes' : 'No'}</p>
        </div>
      </div>

      {/* Force FAB for testing */}
      {forceFab && (
        <div className="fixed inset-x-0 bottom-4 flex justify-center z-50 pointer-events-none pb-[env(safe-area-inset-bottom)]">
          <button
            data-testid="force-mobile-scan-fab"
            aria-label="Abrir scanner (debug)"
            className="pointer-events-auto h-14 min-w-14 px-6 rounded-full shadow-lg bg-primary text-primary-foreground flex items-center gap-2"
            onClick={handleScanClick}
          >
            <ScanLine className="h-5 w-5" />
            <span className="text-sm font-medium">Scanner (Debug)</span>
          </button>
        </div>
      )}
    </div>
  );
}
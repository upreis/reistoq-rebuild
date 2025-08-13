import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FabDebug() {
  const [forcedFab, setForcedFab] = useState(false);
  const nav = useNavigate();

  const debugInfo = {
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    viewportMobile: window.innerWidth <= 768,
    touchDevice: 'ontouchstart' in window,
    userAgentMobile: /Android|iPhone|iPad/i.test(navigator.userAgent),
    userAgent: navigator.userAgent
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>FAB Debug Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Mobile Detection Info:</h3>
            <pre className="bg-muted p-2 rounded text-xs overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
          
          <div className="space-x-2">
            <Button 
              onClick={() => setForcedFab(!forcedFab)}
              variant={forcedFab ? "destructive" : "default"}
            >
              {forcedFab ? "Hide" : "Show"} Forced FAB
            </Button>
            <Button onClick={() => nav("/scanner")}>
              Go to Scanner
            </Button>
            <Button onClick={() => nav("/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Forced FAB for testing */}
      {forcedFab && (
        <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center pb-[env(safe-area-inset-bottom)] pointer-events-none">
          <button
            data-testid="mobile-scan-fab-debug"
            aria-label="Abrir scanner (debug)"
            className="pointer-events-auto h-14 min-w-14 px-6 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 flex items-center gap-2"
            onClick={() => nav("/scanner")}
          >
            <ScanLine className="h-5 w-5" />
            <span className="text-sm font-medium">Scanner</span>
          </button>
        </div>
      )}
    </div>
  );
}
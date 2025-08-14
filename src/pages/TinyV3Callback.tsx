import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function TinyV3Callback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get("code");
      const state = params.get("state");
      
      console.log("🔄 TinyV3Callback recebido:", { code: code?.substring(0, 10) + "...", state: state?.substring(0, 10) + "..." });
      
      if (!code || !state) {
        console.error("❌ Parâmetros ausentes:", { hasCode: !!code, hasState: !!state });
        if (window.top) {
          (window.top as Window).location.replace("/configuracoes?tinyv3=error");
        } else {
          navigate("/configuracoes?tinyv3=error", { replace: true });
        }
        return;
      }
      
      try {
        // Fazer fetch direto para a URL da edge function com query parameters
        const callbackUrl = `https://tdjyfqnxvjgossuncpwm.supabase.co/functions/v1/tiny-v3-oauth-callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
        
        const response = await fetch(callbackUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkanlmcW54dmpnb3NzdW5jcHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTczNTMsImV4cCI6MjA2OTQ3MzM1M30.qrEBpARgfuWF74zHoRzGJyWjgxN_oCG5DdKjPVGJYxk",
          },
        });
        
        const result = await response.json();
        console.log("📊 Resposta do callback:", { status: response.status, result });
        
        if (!response.ok) {
          throw new Error(result.error || "Falha no callback");
        }
        
        // garantir retorno no topo
        if (window.top) {
          (window.top as Window).location.replace("/configuracoes?tinyv3=connected");
        } else {
          navigate("/configuracoes?tinyv3=connected", { replace: true });
        }
      } catch (e) {
        if (window.top) {
          (window.top as Window).location.replace("/configuracoes?tinyv3=error");
        } else {
          navigate("/configuracoes?tinyv3=error", { replace: true });
        }
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Conectando ao Tiny v3...</p>
      </div>
    </div>
  );
}

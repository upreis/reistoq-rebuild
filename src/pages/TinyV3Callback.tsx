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
        // Usar o método invoke do Supabase com URL customizada
        const { data, error } = await supabase.functions.invoke("tiny-v3-oauth-callback", {
          body: {}, // body vazio 
          method: "GET",
          // Adicionar code e state como headers customizados
          headers: {
            "x-code": code,
            "x-state": state,
          }
        });
        
        console.log("📊 Resposta do callback:", { data, error });
        
        if (error) throw error;
        
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

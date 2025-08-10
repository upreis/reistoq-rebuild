import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { IntegrationAccountsManager } from "@/components/integrations/IntegrationAccountsManager";

export function MercadoLivre() {
  // SEO básico
  useEffect(() => {
    document.title = "Pedidos Mercado Livre | REISTOQ";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Pedidos Mercado Livre: conectar e buscar pedidos direto do ML";
      document.head.appendChild(m);
    } else {
      metaDesc.setAttribute("content", "Pedidos Mercado Livre: conectar e buscar pedidos direto do ML");
    }
    const linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!linkCanonical) {
      const l = document.createElement("link");
      l.rel = "canonical";
      l.href = window.location.origin + "/mercado-livre";
      document.head.appendChild(l);
    } else {
      linkCanonical.href = window.location.origin + "/mercado-livre";
    }
  }, []);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const d = (e as any).data;
      if (d?.source === 'mercadolivre-oauth' && d?.connected) {
        toast({ title: 'Mercado Livre conectado', description: 'Conta conectada com sucesso.' });
        try { window.focus(); } catch {}
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const redirectUri = useMemo(() => `https://tdjyfqnxvjgossuncpwm.supabase.co/functions/v1/mercadolivre-oauth/callback`, []);
  const notificationsUri = useMemo(() => `https://tdjyfqnxvjgossuncpwm.supabase.co/functions/v1/mercadolivre-webhook`, []);

  const iniciarOAuth = async () => {
    try {
      setLoadingAuth(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const access = sessionData.session?.access_token;
      if (!access) {
        toast({ title: "Sessão expirada", description: "Faça login novamente", variant: "destructive" });
        return;
      }
      const resp = await fetch(
        `https://tdjyfqnxvjgossuncpwm.supabase.co/functions/v1/mercadolivre-oauth?action=auth-url`,
        {
          method: "GET",
          headers: {
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkanlmcW54dmpnb3NzdW5jcHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTczNTMsImV4cCI6MjA2OTQ3MzM1M30.qrEBpARgfuWF74zHoRzGJyWjgxN_oCG5DdKjPVGJYxk",
            Authorization: `Bearer ${access}`,
            'x-app-origin': window.location.origin,
          },
        }
      );
      const json = await resp.json();
        if (json?.url) {
          // Abre em nova aba com window.opener disponível para postMessage/fechar
          const w = window.open(json.url, "_blank");
          if (!w) {
            // Fallback caso pop-up seja bloqueado
            window.location.href = json.url;
          }
        } else {
          throw new Error(json?.error || "Falha ao gerar URL de autorização");
        }
    } catch (e: any) {
      toast({ title: "Erro ao iniciar conexão", description: e.message, variant: "destructive" });
    } finally {
      setLoadingAuth(false);
    }
  };

  const buscarPedidos = async () => {
    try {
      setLoadingFetch(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const access = sessionData.session?.access_token;
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      if (status) qs.set("status", status);
      const resp = await fetch(
        `https://tdjyfqnxvjgossuncpwm.supabase.co/functions/v1/mercadolivre-orders-proxy?${qs.toString()}`,
        {
          headers: {
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkanlmcW54dmpnb3NzdW5jcHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTczNTMsImV4cCI6MjA2OTQ3MzM1M30.qrEBpARgfuWF74zHoRzGJyWjgxN_oCG5DdKjPVGJYxk",
            Authorization: `Bearer ${access}`,
          },
        }
      );
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || "Erro ao consultar pedidos");
      setOrders(json?.results || json?.orders || []);
      toast({ title: "Pedidos carregados", description: `${(json?.results || []).length} pedidos encontrados` });
    } catch (e: any) {
      toast({ title: "Erro ao buscar pedidos", description: e.message, variant: "destructive" });
    } finally {
      setLoadingFetch(false);
    }
  };

  return (
    <main className="p-4 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Pedidos Mercado Livre (sem Tiny)</h1>
        <p className="text-sm text-muted-foreground">Conecte sua conta do Mercado Livre e consulte pedidos diretamente do ML.</p>
      </header>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>1) Configuração no Mercado Livre</CardTitle>
            <CardDescription>Use estas URLs ao criar sua aplicação no painel do Mercado Livre.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Redirect URI</Label>
              <Input readOnly value={redirectUri} onFocus={(e) => e.currentTarget.select()} />
              <p className="text-xs text-muted-foreground mt-1">Cole em URIs de redirect (ver imagens enviadas).</p>
            </div>
            <div>
              <Label>URL de Notificações (webhook)</Label>
              <Input readOnly value={notificationsUri} onFocus={(e) => e.currentTarget.select()} />
              <p className="text-xs text-muted-foreground mt-1">Opcional. Para eventos automáticos de pedidos.</p>
            </div>
            <p className="text-xs text-muted-foreground">Scopes: Orders, Messages, Items, Shipments, Promotions, Prices (conforme necessidade). Desmarque o que não usar.</p>
            <Button onClick={iniciarOAuth} disabled={loadingAuth}>
              {loadingAuth ? "Redirecionando..." : "Conectar Mercado Livre"}
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>2) Contas de Integração</CardTitle>
            <CardDescription>Gerencie contas conectadas (Tiny, Shopee, Mercado Livre).</CardDescription>
          </CardHeader>
          <CardContent>
            <IntegrationAccountsManager />
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>3) Buscar pedidos direto do ML</CardTitle>
            <CardDescription>Consulta somente leitura direto na API do Mercado Livre.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Data inicial (YYYY-MM-DD)</Label>
                <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="2025-06-01" />
              </div>
              <div>
                <Label>Data final (YYYY-MM-DD)</Label>
                <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="2025-06-30" />
              </div>
              <div>
                <Label>Status (opcional)</Label>
                <Input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="paid, delivered, cancelled..." />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={buscarPedidos} disabled={loadingFetch}>{loadingFetch ? "Buscando..." : "Buscar pedidos"}</Button>
              <Button variant="outline" onClick={() => setOrders([])}>Limpar</Button>
            </div>
            {orders.length > 0 && (
              <div className="overflow-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="p-2">ID</th>
                      <th className="p-2">Data</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Total</th>
                      <th className="p-2">Comprador</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-t">
                        <td className="p-2">{o.id}</td>
                        <td className="p-2">{o.date_created || o.created || '-'}</td>
                        <td className="p-2">{o.status}</td>
                        <td className="p-2">{o.total_amount || o.order_amount || '-'}</td>
                        <td className="p-2">{o?.buyer?.nickname || o?.buyer?.id || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

export default MercadoLivre;

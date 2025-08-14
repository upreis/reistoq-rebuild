import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AnnouncementTickerProps, TickerItem, UrgencyLevel } from "@/components/notifications/AnnouncementTicker";
import { alerts } from "@/config/announcementTicker.config";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
export type TokenVariant = "muted" | "success" | "warning" | "primary" | "destructive" | "card";

export function useAnnouncementTicker() {
  const [items, setItems] = useState<TickerItem[]>([]); // itens manuais salvos em configuracoes
  const [annItems, setAnnItems] = useState<TickerItem[]>([]); // anúncios do Gerenciar Anúncios
  const [themeVariant, setThemeVariant] = useState<Partial<Record<UrgencyLevel, TokenVariant>>>({});
  const [loading, setLoading] = useState(true);
  const [speedMode, setSpeedMode] = useState<"slow" | "normal" | "fast">("normal");
  const { user } = useAuth();
  const location = useLocation();
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Carregar anúncios ativos com filtros fiéis
        try {
          const { data: myRoles } = await supabase
            .from("user_role_assignments")
            .select("role_id");
          const roleSet = new Set<string>((myRoles || []).map((r: any) => String(r.role_id)));

          const { data: ann, error: annErr } = await supabase
            .from("announcements")
            .select("id, kind, message, href, link_label, active, target_routes, target_roles, target_users, expires_at")
            .eq("active", true)
            .order("created_at", { ascending: false });
          if (annErr) throw annErr;

          const path = location.pathname || "/";
          const now = Date.now();

          const filtered = (ann || []).filter((a: any) => {
            if (a.active !== true) return false;
            if (a.expires_at && new Date(a.expires_at).getTime() <= now) return false;

            const routes: string[] | null = (a.target_routes as any) || null;
            const routeOk = !routes || routes.length === 0 || routes.includes('*') || routes.some((r) => path.startsWith(String(r)));
            if (!routeOk) return false;

            const users: string[] | null = (a.target_users as any) || null;
            if (users && users.length > 0) {
              if (!user) return false;
              if (!users.includes(user.id)) return false;
              return true;
            }

            const roles: string[] | null = (a.target_roles as any) || null;
            if (roles && roles.length > 0) {
              return roles.some((rid) => roleSet.has(String(rid)));
            }

            return true;
          });

          const mapped: TickerItem[] = filtered.map((a: any) => {
            const kind = String(a.kind || "info");
            const urgency: UrgencyLevel = kind === "success" ? "low" : kind === "warning" ? "medium" : kind === "destructive" ? "critical" : "medium";
            return {
              id: `ann-${a.id}`,
              title: a.message,
              description: a.link_label || undefined,
              href: a.href || undefined,
              urgency,
            } as TickerItem;
          });

          setAnnItems(mapped);
        } catch (e) {
          console.error("useAnnouncementTicker announcements error", e);
        }
      } catch (e) {
        console.error("useAnnouncementTicker load error", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [location.pathname, user?.id]);

  const speeds = {
    slow: 50,    // px/s
    normal: 80,
    fast: 130,
  } as const;

  const combinedRaw: TickerItem[] = [...annItems];
  const seen = new Set<string>();
  const keyOf = (t: TickerItem) => {
    const title = String(t.title || "").toLowerCase().replace(/\s+/g, " ").trim();
    const href = String(t.href || "").trim();
    return `${title}|${href}`;
  };
  // Remove duplicatas para evitar texto repetido
  const effectiveItems = combinedRaw.filter((t) => {
    const k = keyOf(t);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const props: AnnouncementTickerProps = {
    items: effectiveItems,
    mode: effectiveItems.length <= 1 ? "slide" : "continuous", // Usa slide para item único
    speed: speeds[speedMode],
    pauseOnHover: true,
    loop: effectiveItems.length > 1, // Só faz loop se tem múltiplos itens
    divider: "bar",
    showCollapse: true,
    showPause: false,
    sticky: true,
    themeVariant,
  };

  return { props, items, themeVariant, loading, speedMode };
}

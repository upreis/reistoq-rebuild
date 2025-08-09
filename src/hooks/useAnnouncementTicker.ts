import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AnnouncementTickerProps, TickerItem, UrgencyLevel } from "@/components/notifications/AnnouncementTicker";
import { alerts } from "@/config/announcementTicker.config";
import { useAuth } from "@/contexts/AuthContext";

export type TokenVariant = "muted" | "success" | "warning" | "primary" | "destructive" | "card";

export function useAnnouncementTicker() {
  const [items, setItems] = useState<TickerItem[]>([]); // itens manuais salvos em configuracoes
  const [annItems, setAnnItems] = useState<TickerItem[]>([]); // anúncios do Gerenciar Anúncios
  const [themeVariant, setThemeVariant] = useState<Partial<Record<UrgencyLevel, TokenVariant>>>({});
  const [loading, setLoading] = useState(true);
  const [speedMode, setSpeedMode] = useState<"slow" | "normal" | "fast">("normal");
  const { user } = useAuth();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("configuracoes")
          .select("chave, valor")
          .in("chave", ["ticker_custom_items", "ticker_urgency_map", "ticker_speed_mode"]);
        if (error) throw error;

        const mapRow = data?.find((d) => d.chave === "ticker_urgency_map");
        const itemsRow = data?.find((d) => d.chave === "ticker_custom_items");
        const speedRow = data?.find((d) => d.chave === "ticker_speed_mode");

        if (mapRow?.valor) {
          try {
            const parsed = JSON.parse(mapRow.valor);
            setThemeVariant(parsed);
          } catch {}
        }

        if (itemsRow?.valor) {
          try {
            const parsed: TickerItem[] = JSON.parse(itemsRow.valor);
            setItems(parsed);
          } catch {}
        }

        if (speedRow?.valor) {
          const v = String(speedRow.valor).toLowerCase();
          if (v === "slow" || v === "normal" || v === "fast") setSpeedMode(v);
        }

        // Carregar anúncios ativos e mapear para itens do ticker com filtros fiéis (rotas, usuários e cargos)
        try {
          // Buscar cargos do usuário atual (RLS já limita à organização)
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

          const path = window.location?.pathname || "/";
          const now = Date.now();

          const filtered = (ann || []).filter((a: any) => {
            // validade
            if (a.active !== true) return false;
            if (a.expires_at && new Date(a.expires_at).getTime() <= now) return false;

            // rotas
            const routes: string[] | null = (a.target_routes as any) || null;
            const routeOk = !routes || routes.length === 0 || routes.some((r) => path.startsWith(String(r)));
            if (!routeOk) return false;

            // alvo por usuário
            const users: string[] | null = (a.target_users as any) || null;
            if (users && users.length > 0) {
              if (!user) return false;
              if (!users.includes(user.id)) return false;
              return true; // já passou
            }

            // alvo por cargos
            const roles: string[] | null = (a.target_roles as any) || null;
            if (roles && roles.length > 0) {
              return roles.some((rid) => roleSet.has(String(rid)));
            }

            // sem alvo específico -> todos
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
  }, []);

  const speeds = {
    slow: 50,    // px/s
    normal: 80,
    fast: 130,
  } as const;

  const baseManualItems = items.length ? items : alerts;
  const combinedRaw: TickerItem[] = [...annItems, ...baseManualItems];
  const seen = new Set<string>();
  const keyOf = (t: TickerItem) => {
    const title = String(t.title || "").toLowerCase().replace(/\s+/g, " ").trim();
    const href = String(t.href || "").trim();
    return `${title}|${href}`;
  };
  const effectiveItems = combinedRaw.filter((t) => {
    const k = keyOf(t);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const props: AnnouncementTickerProps = {
    items: effectiveItems,
    mode: "continuous",
    speed: speeds[speedMode],
    pauseOnHover: true,
    loop: true,
    divider: "bar",
    showCollapse: true,
    showPause: false,
    sticky: true,
    themeVariant,
  };

  return { props, items, themeVariant, loading, speedMode };
}

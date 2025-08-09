import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AnnouncementTickerProps, TickerItem, UrgencyLevel } from "@/components/notifications/AnnouncementTicker";
import { alerts } from "@/config/announcementTicker.config";

export type TokenVariant = "muted" | "success" | "warning" | "primary" | "destructive" | "card";

export function useAnnouncementTicker() {
  const [items, setItems] = useState<TickerItem[]>([]); // itens manuais salvos em configuracoes
  const [annItems, setAnnItems] = useState<TickerItem[]>([]); // anúncios do Gerenciar Anúncios
  const [themeVariant, setThemeVariant] = useState<Partial<Record<UrgencyLevel, TokenVariant>>>({});
  const [loading, setLoading] = useState(true);
  const [speedMode, setSpeedMode] = useState<"slow" | "normal" | "fast">("normal");

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

        // Carregar anúncios ativos e mapear para itens do ticker
        try {
          const { data: ann, error: annErr } = await supabase
            .from("announcements")
            .select("id, kind, message, href, link_label, active, target_routes")
            .eq("active", true)
            .order("created_at", { ascending: false });
          if (annErr) throw annErr;
          const path = window.location?.pathname || "/";
          const mapped: TickerItem[] = (ann || []).filter((a: any) => {
            const routes: string[] | null = a.target_routes as any;
            if (!routes || !routes.length) return true;
            return routes.some((r) => path.startsWith(r));
          }).map((a: any) => {
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

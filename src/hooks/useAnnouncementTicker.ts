import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AnnouncementTickerProps, TickerItem, UrgencyLevel } from "@/components/notifications/AnnouncementTicker";
import { alerts } from "@/config/announcementTicker.config";

export type TokenVariant = "muted" | "warning" | "primary" | "destructive" | "card";

export function useAnnouncementTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);
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

  const effectiveItems = items.length ? items : alerts;
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

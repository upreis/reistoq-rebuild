import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AnnouncementTickerProps, TickerItem, UrgencyLevel } from "@/components/notifications/AnnouncementTicker";

export type TokenVariant = "muted" | "warning" | "primary" | "destructive" | "card";

export function useAnnouncementTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [themeVariant, setThemeVariant] = useState<Partial<Record<UrgencyLevel, TokenVariant>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("configuracoes")
          .select("chave, valor")
          .in("chave", ["ticker_custom_items", "ticker_urgency_map"]);
        if (error) throw error;

        const mapRow = data?.find((d) => d.chave === "ticker_urgency_map");
        const itemsRow = data?.find((d) => d.chave === "ticker_custom_items");

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
      } catch (e) {
        console.error("useAnnouncementTicker load error", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const props: Partial<AnnouncementTickerProps> & { themeVariant?: Partial<Record<UrgencyLevel, TokenVariant>> } = {
    items,
    mode: "continuous",
    speed: 80,
    pauseOnHover: true,
    loop: true,
    divider: "bar",
    showCollapse: true,
    showPause: true,
    sticky: true,
    themeVariant,
  };

  return { props, items, themeVariant, loading };
}

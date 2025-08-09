import { AnnouncementTickerProps, TickerItem } from "@/components/notifications/AnnouncementTicker";

// Exemplo de itens iniciais (edite livremente)
export const alerts: TickerItem[] = [
  { id: "1", title: "Estoque baixo no SKU XYZ", urgency: "high", href: "/estoque" , icon: "Flame" },
  { id: "2", title: "Promoção relâmpago 20% OFF", urgency: "medium", href: "/pedidos", icon: "TriangleAlert" },
  { id: "3", title: "Pedido #4821 enviado", description: "Rastreio disponível", urgency: "low", href: "/historico", icon: "Info" },
  { id: "4", title: "Falha na integração Zoho", urgency: "critical", href: "/configuracoes", icon: "AlertCircle" },
];

// Config padrão para uso global
const tickerConfig: Pick<AnnouncementTickerProps, "items" | "mode" | "speed" | "pauseOnHover" | "loop" | "divider" | "showClose" | "sticky"> = {
  items: alerts,
  mode: "continuous",
  speed: 80, // px/s
  pauseOnHover: true,
  loop: true,
  divider: "bar",
  showClose: true,
  sticky: true,
};

export default tickerConfig;

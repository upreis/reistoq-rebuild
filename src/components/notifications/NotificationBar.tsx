import React from "react";
import { useLocation } from "react-router-dom";
import { Bell, ChevronUp, ChevronDown, Settings2, Sparkles, CheckCircle, Clock, Megaphone, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { useNotifications } from "@/hooks/useNotifications";
export type NotificationKind = "info" | "success" | "warning" | "destructive";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  message: string;
  href?: string;
  linkLabel?: string;
  type?: "system_alert" | "announcement";
  target_routes?: string[];
}

const COLLAPSE_KEY = "reistoq.notification.collapsed";

export function usePersistentState<T>(key: string, initial: T) {
  const [state, setState] = React.useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  React.useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);
  return [state, setState] as const;
}

export function NotificationBar({ placement = 'sticky' }: { placement?: 'sticky' | 'header' }) {
  const { toast } = useToast();
  const [collapsed, setCollapsed] = usePersistentState<boolean>(COLLAPSE_KEY, false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const ROTATION_MS = 5000; // 5s por especificação
  const { fetchNotifications, saveAnnouncement, removeAnnouncement, dismissNotification } = useNotifications();
  const containerCls = placement === 'sticky' ? 'sticky top-0 z-40 flex w-full justify-center' : 'w-full flex justify-center';
  const innerWrapCls = placement === 'sticky' ? 'mx-3 mt-3 w-full max-w-4xl animate-fade-in' : 'mx-1 mt-1 w-full max-w-3xl animate-fade-in';
  const location = useLocation();

  // Buscar notificações na montagem
  React.useEffect(() => {
    const loadNotifications = async () => {
      const fetchedNotifications = await fetchNotifications();
      const currentPath = location.pathname;
      const matchesRoute = (routes?: string[]) => !routes || routes.length === 0 || routes.includes('*') || routes.some(r => currentPath.startsWith(r));
      const mapped = fetchedNotifications.map(n => ({
        id: n.id,
        kind: n.kind,
        message: n.message,
        href: n.href,
        linkLabel: n.link_label,
        type: n.type,
        target_routes: (n as any).target_routes || undefined,
      }));
      setNotifications(mapped.filter(item => matchesRoute(item.target_routes)));
    };
    loadNotifications();
  }, [location.pathname]);

  // Rotação automática de notificações a cada 5 segundos
  React.useEffect(() => {
    if (notifications.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % notifications.length);
      setProgress(0);
    }, ROTATION_MS);
    return () => clearInterval(interval);
  }, [notifications.length]);

  const activeItem: NotificationItem | null = notifications[currentIndex] ?? null;

  // Barra de progresso sincronizada com a rotação (incrementa 2% a cada 100ms)
  React.useEffect(() => {
    if (!activeItem) return;
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + 2));
    }, 100);
    return () => clearInterval(interval);
  }, [currentIndex, activeItem]);

  const onDismiss = () => {
    if (activeItem) {
      dismissNotification(activeItem.id, activeItem.type || "system_alert");
      // Remover da lista local
      setNotifications(prev => prev.filter(n => n.id !== activeItem.id));
      // Ajustar índice se necessário
      if (currentIndex >= notifications.length - 1) {
        setCurrentIndex(0);
      }
    }
  };

  if (collapsed) {
    return (
        <div className={containerCls}>
          <div className="flex items-center gap-2 rounded-full border bg-background/95 px-3 py-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60 animate-fade-in">
            <Bell className="h-[14px] w-[14px] text-primary" />
            <span className="text-[13px] text-muted-foreground">Avisos</span>
            <button
              onClick={() => setCollapsed(false)}
              className="inline-flex items-center gap-1 text-[13px] text-primary hover:underline"
            >
              <ChevronDown className="h-[14px] w-[14px]" /> Mostrar
            </button>
          </div>
        </div>
    );
  }

  if (!activeItem) {
    // Sem conteúdo: não renderiza (ou manter o pill recolhido)
    return null;
  }

  const STYLE: Record<NotificationKind, { bg: string; text: string }> = {
    info: {
      bg: "bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--primary))]",
      text: "text-primary-foreground",
    },
    success: {
      bg: "bg-gradient-to-r from-[hsl(var(--success))] to-[hsl(var(--success))]",
      text: "text-success-foreground",
    },
    warning: {
      bg: "bg-gradient-to-r from-[hsl(var(--warning))] to-[hsl(var(--warning))]",
      text: "text-warning-foreground",
    },
    destructive: {
      bg: "bg-gradient-to-r from-[hsl(var(--destructive))] to-[hsl(var(--destructive))]",
      text: "text-destructive-foreground",
    },
  } as const;

  const ICON_BY_KIND: Record<NotificationKind, React.ComponentType<{ className?: string }>> = {
    info: Megaphone,
    success: CheckCircle,
    warning: Clock,
    destructive: AlertTriangle,
  };

  const style = STYLE[activeItem.kind];
  const Icon = ICON_BY_KIND[activeItem.kind];

  return (
    <div className={containerCls}>
      <div className={innerWrapCls}>
        <Alert className={`${style.bg} ${style.text} border-transparent shadow-sm p-2 px-3 relative overflow-hidden`}> 
          <div className="flex w-full items-center gap-2">
              <Icon className="h-[14px] w-[14px]" />
            <div className="flex-1">
              <AlertDescription className="text-[13px]">
                {activeItem.message}
                {activeItem.href && (
                  <a
                    href={activeItem.href}
                    className="ml-2 text-[13px] underline underline-offset-4 hover-scale opacity-90 hover:opacity-100"
                  >
                    {activeItem.linkLabel ?? "Ver mais"}
                  </a>
                )}
              </AlertDescription>
            </div>

            <div className="flex items-center gap-1">
              <PermissionGate required="system:announce">
                <NotificationManager
                  onSave={async (item) => {
                    await saveAnnouncement(item as any);
                    // Recarregar notificações filtrando pela rota atual
                    const fetchedNotifications = await fetchNotifications();
                    const currentPath = location.pathname;
                    const matchesRoute = (routes?: string[]) => !routes || routes.length === 0 || routes.includes('*') || routes.some(r => currentPath.startsWith(r));
                    const mapped = fetchedNotifications.map(n => ({
                      id: n.id,
                      kind: n.kind,
                      message: n.message,
                      href: n.href,
                      linkLabel: n.link_label,
                      type: n.type,
                      target_routes: (n as any).target_routes || undefined,
                    }));
                    setNotifications(mapped.filter(item => matchesRoute(item.target_routes)));
                  }}
                />
              </PermissionGate
              >

              <Button variant="ghost" size="icon" onClick={() => setCollapsed(true)} aria-label="Recolher barra">
                <ChevronUp className="h-[14px] w-[14px]" />
              </Button>
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="absolute bottom-0 left-0 h-1 w-full bg-primary-foreground/20">
            <div
              className="h-full bg-primary-foreground/60 transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </Alert>
      </div>
    </div>
  );
}

function NotificationManager({
  onSave,
}: {
  onSave: (n: { kind: NotificationKind; message: string; href?: string; link_label?: string; target_routes?: string[] }) => void
}) {
  const [open, setOpen] = React.useState(false);
  const [kind, setKind] = React.useState<NotificationKind>("info");
  const [message, setMessage] = React.useState<string>("");
  const [href, setHref] = React.useState<string>("");
  const [linkLabel, setLinkLabel] = React.useState<string>("");
  const [selectedRoutes, setSelectedRoutes] = React.useState<string[]>([]);
  const availableRoutes = ["/dashboard", "/estoque", "/pedidos", "/depara", "/historico", "/scanner"];

  const handleSave = () => {
    onSave({
      kind,
      message,
      href: href || undefined,
      link_label: linkLabel || undefined,
      target_routes: selectedRoutes.length > 0 ? selectedRoutes : undefined,
    });
    setOpen(false);
    // Limpar formulário
    setKind("info");
    setMessage("");
    setHref("");
    setLinkLabel("");
    setSelectedRoutes([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Gerenciar notificações">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar novo anúncio</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="kind">Tipo</Label>
            <Select value={kind} onValueChange={(v: NotificationKind) => setKind(v)}>
              <SelectTrigger id="kind">
                <SelectValue placeholder="Selecione um tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Informação</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="warning">Aviso</SelectItem>
                <SelectItem value="destructive">Crítico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="href">Link (opcional)</Label>
            <Input id="href" value={href} onChange={(e) => setHref(e.target.value)} placeholder="https://..." />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="linkLabel">Texto do link (opcional)</Label>
            <Input id="linkLabel" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Ver mais" />
          </div>

          <div className="grid gap-2">
            <Label>Páginas alvo (opcional)</Label>
            <div className="text-xs text-muted-foreground">Deixe vazio para mostrar em todas as páginas.</div>
            <div className="grid grid-cols-2 gap-2">
              {availableRoutes.map((route) => (
                <label key={route} className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedRoutes.includes(route)}
                    onCheckedChange={(checked) => {
                      const isChecked = Boolean(checked);
                      setSelectedRoutes((prev) =>
                        isChecked ? [...prev, route] : prev.filter((r) => r !== route)
                      );
                    }}
                  />
                  <span className="text-sm">{route}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!message.trim()}>Criar anúncio</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

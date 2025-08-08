import React from "react";
import { Bell, ChevronUp, ChevronDown, X, Settings2 } from "lucide-react";
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

export function NotificationBar() {
  const { toast } = useToast();
  const [collapsed, setCollapsed] = usePersistentState<boolean>(COLLAPSE_KEY, false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const { fetchNotifications, saveAnnouncement, removeAnnouncement, dismissNotification } = useNotifications();

  // Buscar notificações na montagem
  React.useEffect(() => {
    const loadNotifications = async () => {
      const fetchedNotifications = await fetchNotifications();
      setNotifications(fetchedNotifications.map(n => ({
        id: n.id,
        kind: n.kind,
        message: n.message,
        href: n.href,
        linkLabel: n.link_label,
        type: n.type,
      })));
    };
    loadNotifications();
  }, []);

  // Rotação automática de notificações a cada 8 segundos
  React.useEffect(() => {
    if (notifications.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % notifications.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [notifications.length]);

  const activeItem: NotificationItem | null = notifications[currentIndex] ?? null;

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
      <div className="sticky top-0 z-40 flex w-full justify-center">
        <div className="mt-2 flex items-center gap-2 rounded-full border bg-background/95 px-3 py-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60 animate-fade-in">
          <Bell className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground">Avisos</span>
          <button
            onClick={() => setCollapsed(false)}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ChevronDown className="h-3 w-3" /> Mostrar
          </button>
        </div>
      </div>
    );
  }

  if (!activeItem) {
    // Sem conteúdo: não renderiza (ou manter o pill recolhido)
    return null;
  }

  const variantCls: Record<NotificationKind, string> = {
    info: "border-primary/30",
    success: "border-success/40",
    warning: "border-warning/40",
    destructive: "border-destructive/50",
  } as const;

  return (
    <div className="sticky top-0 z-40 flex w-full justify-center">
      <div className="mx-3 mt-3 w-full max-w-4xl animate-fade-in">
        <Alert className={`bg-muted/40 ${variantCls[activeItem.kind]} shadow-sm`}> 
          <div className="flex w-full items-center gap-3">
            <Bell className="h-4 w-4 text-primary" />
            <div className="flex-1">
              <AlertDescription className="text-sm text-foreground">
                {activeItem.message}
                {activeItem.href && (
                  <a
                    href={activeItem.href}
                    className="ml-2 text-sm text-primary underline underline-offset-4 hover-scale"
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
                    await saveAnnouncement(item);
                    // Recarregar notificações
                    const fetchedNotifications = await fetchNotifications();
                    setNotifications(fetchedNotifications.map(n => ({
                      id: n.id,
                      kind: n.kind,
                      message: n.message,
                      href: n.href,
                      linkLabel: n.link_label,
                      type: n.type,
                    })));
                  }}
                />
              </PermissionGate>

              <Button variant="ghost" size="icon" onClick={() => setCollapsed(true)} aria-label="Recolher barra">
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onDismiss} aria-label="Fechar barra">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Alert>
      </div>
    </div>
  );
}

function NotificationManager({
  onSave,
}: {
  onSave: (n: { kind: NotificationKind; message: string; href?: string; link_label?: string }) => void
}) {
  const [open, setOpen] = React.useState(false);
  const [kind, setKind] = React.useState<NotificationKind>("info");
  const [message, setMessage] = React.useState<string>("");
  const [href, setHref] = React.useState<string>("");
  const [linkLabel, setLinkLabel] = React.useState<string>("");

  const handleSave = () => {
    onSave({
      kind,
      message,
      href: href || undefined,
      link_label: linkLabel || undefined,
    });
    setOpen(false);
    // Limpar formulário
    setKind("info");
    setMessage("");
    setHref("");
    setLinkLabel("");
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
        </div>

        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!message.trim()}>Criar anúncio</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

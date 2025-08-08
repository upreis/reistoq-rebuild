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

export type NotificationKind = "info" | "success" | "warning" | "destructive";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  message: string;
  href?: string;
  linkLabel?: string;
}

const COLLAPSE_KEY = "reistoq.notification.collapsed";
const MANUAL_KEY = "reistoq.notification.manual";

function usePersistentState<T>(key: string, initial: T) {
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
  const [manual, setManual] = usePersistentState<NotificationItem | null>(MANUAL_KEY, null);

  // Placeholder: espaço reservado para integrar alertas automáticos do backend
  // Ex.: buscar da tabela "system_alerts" (a ser criada) e rotacionar itens
  const systemAlerts: NotificationItem[] = [];

  const activeItem: NotificationItem | null = manual ?? systemAlerts[0] ?? null;

  const onDismiss = () => {
    // Ao dispensar, apenas colapsa (permite reabrir)
    setCollapsed(true);
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
                  initial={manual ?? undefined}
                  onSave={(item) => {
                    setManual(item);
                    toast({ title: "Anúncio atualizado", description: "A barra refletirá sua mensagem." });
                  }}
                  onClear={() => {
                    setManual(null);
                    toast({ title: "Anúncio removido", description: "A barra voltará a mostrar alertas do sistema." });
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
  initial,
  onSave,
  onClear,
}: {
  initial?: NotificationItem
  onSave: (n: NotificationItem) => void
  onClear: () => void
}) {
  const [open, setOpen] = React.useState(false);
  const [kind, setKind] = React.useState<NotificationKind>(initial?.kind ?? "info");
  const [message, setMessage] = React.useState<string>(initial?.message ?? "");
  const [href, setHref] = React.useState<string>(initial?.href ?? "");
  const [linkLabel, setLinkLabel] = React.useState<string>(initial?.linkLabel ?? "");

  const handleSave = () => {
    const item: NotificationItem = {
      id: initial?.id ?? `manual-${Date.now()}`,
      kind,
      message,
      href: href || undefined,
      linkLabel: linkLabel || undefined,
    };
    onSave(item);
    setOpen(false);
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
          <DialogTitle>Gerenciar anúncio manual</DialogTitle>
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
          {initial && (
            <Button variant="outline" onClick={() => { onClear(); setOpen(false); }}>Remover anúncio</Button>
          )}
          <Button onClick={handleSave} disabled={!message.trim()}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

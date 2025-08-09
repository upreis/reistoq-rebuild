import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2 } from "lucide-react";

interface AnnRow {
  id: string;
  kind: "info" | "success" | "warning" | "destructive";
  message: string;
  href?: string | null;
  link_label?: string | null;
  active: boolean;
  expires_at?: string | null;
  target_routes?: string[] | null;
  target_roles?: string[] | null;
  target_users?: string[] | null;
}

const AVAILABLE_ROUTES = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/estoque", label: "Estoque" },
  { path: "/pedidos", label: "Pedidos" },
  { path: "/depara", label: "DE/PARA" },
  { path: "/historico", label: "Histórico" },
  { path: "/scanner", label: "Scanner" },
  { path: "/configuracoes", label: "Configurações" },
] as const;

export function AnnouncementsManager() {
  const { user, organizacao } = useAuth();
  const { toast } = useToast();
  const [list, setList] = useState<AnnRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<AnnRow["kind"]>("info");
  const [message, setMessage] = useState("");
  const [href, setHref] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  const [active, setActive] = useState(true);

  // Seleção de público
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Editar anúncio
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<AnnRow | null>(null);
  const [editKind, setEditKind] = useState<AnnRow["kind"]>("info");
  const [editMessage, setEditMessage] = useState("");
  const [editHref, setEditHref] = useState("");
  const [editLinkLabel, setEditLinkLabel] = useState("");
  const [editSelectedRoutes, setEditSelectedRoutes] = useState<string[]>([]);
  const [editActive, setEditActive] = useState(true);
  const [editSelectedRoleIds, setEditSelectedRoleIds] = useState<string[]>([]);
  const [editSelectedUserIds, setEditSelectedUserIds] = useState<string[]>([]);



  const loadAll = async () => {
    setLoading(true);
    try {
      const [{ data: ann }, { data: rls }, { data: profs }] = await Promise.all([
        supabase.from("announcements").select("*").order("created_at", { ascending: false }),
        supabase.from("roles").select("id,name"),
        organizacao
          ? supabase.from("profiles").select("id,nome_exibicao,nome_completo").eq("organizacao_id", organizacao.id)
          : supabase.from("profiles").select("id,nome_exibicao,nome_completo").limit(0),
      ]);
      setList((ann || []) as AnnRow[]);
      setRoles((rls || []).map((r: any) => ({ id: r.id, name: r.name })));
      setUsers(
        (profs || []).map((p: any) => ({ id: p.id, name: p.nome_exibicao || p.nome_completo || "Usuário" }))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizacao?.id]);

  const toggleRole = (id: string) =>
    setSelectedRoleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleUser = (id: string) =>
    setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleEditRole = (id: string) =>
    setEditSelectedRoleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleEditUser = (id: string) =>
    setEditSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleRoute = (path: string) =>
    setSelectedRoutes((prev) => (prev.includes(path) ? prev.filter((x) => x !== path) : [...prev, path]));
  const toggleEditRoute = (path: string) =>
    setEditSelectedRoutes((prev) => (prev.includes(path) ? prev.filter((x) => x !== path) : [...prev, path]));

  const handleCreate = async () => {
    try {
      if (!user) {
        toast({ variant: "destructive", title: "Erro", description: "Usuário não autenticado" });
        return;
      }
      const payload: any = {
        created_by: user.id,
        kind,
        message,
        href: href || null,
        link_label: linkLabel || null,
        active,
        target_routes: selectedRoutes.length ? selectedRoutes : null,
        target_roles: selectedRoleIds.length ? selectedRoleIds : null,
        target_users: selectedUserIds.length ? selectedUserIds : null,
      };

      const { error } = await supabase.from("announcements").insert(payload);
      if (error) throw error;
      toast({ title: "Anúncio criado", description: "Notificação publicada para o público selecionado." });
      setOpen(false);
      setKind("info");
      setMessage("");
      setHref("");
      setLinkLabel("");
      setSelectedRoutes([]);
      setSelectedRoleIds([]);
      setSelectedUserIds([]);
      loadAll();
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Erro", description: e.message || "Falha ao criar anúncio" });
    }
  };

  const handleToggleActive = async (row: AnnRow) => {
    try {
      const { error } = await supabase
        .from("announcements")
        .update({ active: !row.active })
        .eq("id", row.id);
      if (error) throw error;
      setList((prev) => prev.map((a) => (a.id === row.id ? { ...a, active: !row.active } : a)));
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message || "Falha ao atualizar" });
    }
  };

  const handleDelete = async (row: AnnRow) => {
    try {
      const { error } = await supabase.from("announcements").delete().eq("id", row.id);
      if (error) throw error;
      setList((prev) => prev.filter((a) => a.id !== row.id));
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message || "Falha ao excluir" });
    }
  };
  const openEdit = (row: AnnRow) => {
    setEditRow(row);
    setEditKind(row.kind);
    setEditMessage(row.message);
    setEditHref(row.href || "");
    setEditLinkLabel(row.link_label || "");
    setEditSelectedRoutes(row.target_routes || []);
    setEditActive(row.active);
    setEditSelectedRoleIds(row.target_roles || []);
    setEditSelectedUserIds(row.target_users || []);
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editRow) return;
    try {
      const payload: any = {
        kind: editKind,
        message: editMessage,
        href: editHref || null,
        link_label: editLinkLabel || null,
        active: editActive,
        target_routes: editSelectedRoutes.length ? editSelectedRoutes : null,
        target_roles: editSelectedRoleIds.length ? editSelectedRoleIds : null,
        target_users: editSelectedUserIds.length ? editSelectedUserIds : null,
      };
      const { error } = await supabase.from("announcements").update(payload).eq("id", editRow.id);
      if (error) throw error;
      toast({ title: "Anúncio atualizado", description: "Alterações salvas." });
      setEditOpen(false);
      setEditRow(null);
      loadAll();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message || "Falha ao atualizar" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Gerenciar Anúncios</CardTitle>
        <CardDescription>Crie avisos para toda a equipe, por cargo/role, usuários específicos e por páginas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{list.length} anúncio(s)</div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2"/>Novo anúncio</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Novo anúncio</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Tipo</Label>
                    <Select value={kind} onValueChange={(v: AnnRow["kind"]) => setKind(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo"/>
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
                    <Label>Link (opcional)</Label>
                    <Input value={href} onChange={(e) => setHref(e.target.value)} placeholder="https://..."/>
                  </div>
                  <div className="grid gap-2">
                    <Label>Texto do link</Label>
                    <Input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Ver mais"/>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Mensagem</Label>
                  <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Digite o aviso"/>
                </div>

                <Separator />

                <div className="grid gap-2">
                  <Label>Páginas (rotas) alvo</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {AVAILABLE_ROUTES.map((r) => (
                      <label key={r.path} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={selectedRoutes.includes(r.path)} onCheckedChange={() => toggleRoute(r.path)} />
                        {r.label}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Deixe vazio para todas as páginas</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cargos (roles) alvo</Label>
                    <ScrollArea className="h-32 border rounded-md p-2">
                      <div className="space-y-2">
                        {roles.map((r) => (
                          <label key={r.id} className="flex items-center gap-2 text-sm">
                            <Checkbox checked={selectedRoleIds.includes(r.id)} onCheckedChange={() => toggleRole(r.id)} />
                            {r.name}
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                  <div className="space-y-2">
                    <Label>Usuários alvo</Label>
                    <ScrollArea className="h-32 border rounded-md p-2">
                      <div className="space-y-2">
                        {users.map((u) => (
                          <label key={u.id} className="flex items-center gap-2 text-sm">
                            <Checkbox checked={selectedUserIds.includes(u.id)} onCheckedChange={() => toggleUser(u.id)} />
                            {u.name}
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch checked={active} onCheckedChange={setActive} id="ann-active"/>
                  <Label htmlFor="ann-active">Ativo</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={!message.trim()}>Criar anúncio</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {list.map((row) => (
            <div key={row.id} className="flex items-center justify-between border rounded-lg p-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={row.active ? "default" : "secondary"}>{row.kind}</Badge>
                  {row.target_routes?.length ? (
                    <span className="text-xs text-muted-foreground">Rotas: {row.target_routes.join(", ")}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Todas as rotas</span>
                  )}
                </div>
                <div className="text-sm text-foreground">{row.message}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => handleToggleActive(row)}>
                  {row.active ? "Desativar" : "Ativar"}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>Editar</Button>
                <Button size="icon" variant="ghost" onClick={() => handleDelete(row)} aria-label="Excluir">
                  <Trash2 className="h-4 w-4"/>
                </Button>
              </div>
            </div>
          ))}
          {!list.length && (
            <div className="text-sm text-muted-foreground">Nenhum anúncio criado ainda.</div>
          )}
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar anúncio</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select value={editKind} onValueChange={(v: AnnRow["kind"]) => setEditKind(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo"/>
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
                <Label>Link (opcional)</Label>
                <Input value={editHref} onChange={(e) => setEditHref(e.target.value)} placeholder="https://..."/>
              </div>
              <div className="grid gap-2">
                <Label>Texto do link</Label>
                <Input value={editLinkLabel} onChange={(e) => setEditLinkLabel(e.target.value)} placeholder="Ver mais"/>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Mensagem</Label>
              <Input value={editMessage} onChange={(e) => setEditMessage(e.target.value)} placeholder="Digite o aviso"/>
            </div>

            <Separator />

            <div className="grid gap-2">
              <Label>Páginas (rotas) alvo</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AVAILABLE_ROUTES.map((r) => (
                  <label key={r.path} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={editSelectedRoutes.includes(r.path)} onCheckedChange={() => toggleEditRoute(r.path)} />
                    {r.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Deixe vazio para todas as páginas</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cargos (roles) alvo</Label>
                <ScrollArea className="h-32 border rounded-md p-2">
                  <div className="space-y-2">
                    {roles.map((r) => (
                      <label key={r.id} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={editSelectedRoleIds.includes(r.id)} onCheckedChange={() => toggleEditRole(r.id)} />
                        {r.name}
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <div className="space-y-2">
                <Label>Usuários alvo</Label>
                <ScrollArea className="h-32 border rounded-md p-2">
                  <div className="space-y-2">
                    {users.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={editSelectedUserIds.includes(u.id)} onCheckedChange={() => toggleEditUser(u.id)} />
                        {u.name}
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={editActive} onCheckedChange={setEditActive} id="ann-edit-active"/>
              <Label htmlFor="ann-edit-active">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={!editMessage.trim()}>Salvar alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

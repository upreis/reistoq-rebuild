import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Pencil, Eye, EyeOff } from "lucide-react";

export type IntegrationProvider = "tiny" | "shopee" | "mercadolivre";

type IntegrationAccount = {
  id: string;
  organization_id: string;
  provider: IntegrationProvider;
  name: string;
  cnpj: string | null;
  account_identifier: string | null;
  is_active: boolean;
  auth_data: any | null;
  created_at: string;
  updated_at: string;
};

export function IntegrationAccountsManager() {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<IntegrationAccount[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // form state (create)
  const [provider, setProvider] = useState<IntegrationProvider>("tiny");
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [token, setToken] = useState("");
  const [active, setActive] = useState(true);

  // form state (edit)
  const [editId, setEditId] = useState<string | null>(null);
  const [eProvider, setEProvider] = useState<IntegrationProvider>("tiny");
  const [eName, setEName] = useState("");
  const [eCnpj, setECnpj] = useState("");
  const [eIdentifier, setEIdentifier] = useState("");
  const [eToken, setEToken] = useState("");
  const [eActive, setEActive] = useState(true);
  const [showToken, setShowToken] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("integration_accounts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar contas", description: error.message, variant: "destructive" });
    } else {
      setList(data as IntegrationAccount[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setProvider("tiny");
    setName("");
    setCnpj("");
    setIdentifier("");
    setToken("");
    setActive(true);
  };

  const create = async () => {
    if (!name.trim()) {
      toast({ title: "Informe o nome da conta", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Usuário não autenticado.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("organizacao_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.organizacao_id) {
        throw new Error("Não foi possível obter a organização do usuário.");
      }

      const { error } = await supabase.from("integration_accounts").insert({
        organization_id: profile.organizacao_id,
        provider,
        name,
        cnpj: cnpj || null,
        account_identifier: identifier || null,
        is_active: active,
      } as any);

      if (error) throw error;

      toast({ title: "Conta adicionada", description: `${name} (${provider}) criada com sucesso.` });
      setOpen(false);
      resetForm();
      await load();
    } catch (err: any) {
      toast({ title: "Erro ao adicionar conta", description: err.message ?? "Falha ao salvar.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta conta de integração?")) return;
    const { error } = await supabase.from("integration_accounts").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Conta removida" });
    load();
  };

  const toggleActive = async (id: string, value: boolean) => {
    const { error } = await supabase.from("integration_accounts").update({ is_active: value }).eq("id", id);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const openEdit = (acc: IntegrationAccount) => {
    setEditId(acc.id);
    setEProvider(acc.provider);
    setEName(acc.name);
    setECnpj(acc.cnpj || "");
    setEIdentifier(acc.account_identifier || "");
    setEToken("");
    setEActive(acc.is_active);
    setShowToken(false);
    setEditOpen(true);
  };

  const updateAcc = async () => {
    if (!editId) return;
    if (!eName.trim()) {
      toast({ title: "Informe o nome da conta", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from("integration_accounts")
        .update({
          name: eName,
          cnpj: eCnpj || null,
          account_identifier: eIdentifier || null,
          is_active: eActive,
        })
        .eq("id", editId);
      if (error) throw error;
      toast({ title: "Conta atualizada" });
      setEditOpen(false);
      await load();
    } catch (err: any) {
      toast({ title: "Erro ao atualizar", description: err.message ?? "Falha ao salvar.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrações · Contas</CardTitle>
        <CardDescription>Cadastre contas do Tiny, Shopee e Mercado Livre. Suportamos múltiplos CNPJs por provedor.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between mb-4">
          <div className="text-sm text-muted-foreground">{list.length} conta(s) cadastrada(s)</div>
          <div className="flex gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1"/>Nova conta</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar conta de integração</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                  <div>
                    <Label>Provedor</Label>
                    <Select value={provider} onValueChange={(v) => setProvider(v as IntegrationProvider)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tiny">Tiny ERP</SelectItem>
                        <SelectItem value="shopee">Shopee</SelectItem>
                        <SelectItem value="mercadolivre">Mercado Livre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Nome da conta</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Loja Centro" />
                  </div>
                  <div>
                    <Label>CNPJ (opcional)</Label>
                    <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
                  </div>
                  <div>
                    <Label>Identificador (opcional)</Label>
                    <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="shop_id / seller_id / conta" />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Token / Credencial (guardado com RLS)</Label>
                    <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Cole o token da API" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={active} onCheckedChange={setActive} />
                    <span className="text-sm">Ativa</span>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={create} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Editar conta */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar conta de integração</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                  <div className="md:col-span-2">
                    <Label>Provedor</Label>
                    <Input value={eProvider} readOnly className="capitalize" />
                  </div>
                  <div>
                    <Label>Nome da conta</Label>
                    <Input value={eName} onChange={(e) => setEName(e.target.value)} />
                  </div>
                  <div>
                    <Label>CNPJ (opcional)</Label>
                    <Input value={eCnpj} onChange={(e) => setECnpj(e.target.value)} />
                  </div>
                  <div>
                    <Label>Identificador (opcional)</Label>
                    <Input value={eIdentifier} onChange={(e) => setEIdentifier(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Token (clique no olho para visualizar)</Label>
                    <div className="flex gap-2">
                      <Input type={showToken ? 'text' : 'password'} value={eToken} onChange={(e) => setEToken(e.target.value)} />
                      <Button variant="outline" size="icon" onClick={() => setShowToken((v) => !v)} aria-label="Mostrar token">
                        {showToken ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={eActive} onCheckedChange={setEActive} />
                    <span className="text-sm">Ativa</span>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
                  <Button onClick={updateAcc} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Salvar alterações
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="overflow-x-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provedor</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Identificador</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((acc) => (
                <TableRow key={acc.id}>
                  <TableCell className="capitalize">{acc.provider}</TableCell>
                  <TableCell>{acc.name}</TableCell>
                  <TableCell>{acc.cnpj || '-'}</TableCell>
                  <TableCell>{acc.account_identifier || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={acc.is_active} onCheckedChange={(v) => toggleActive(acc.id, v)} />
                      <span className="text-xs text-muted-foreground">{acc.is_active ? 'Ativa' : 'Inativa'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(acc)} aria-label="Editar">
                        <Pencil className="h-4 w-4"/>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(acc.id)} aria-label="Excluir">
                        <Trash2 className="h-4 w-4"/>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nenhuma conta cadastrada</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}


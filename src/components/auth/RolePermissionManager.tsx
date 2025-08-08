import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { PermissionGate } from "./PermissionGate";

interface Role { id: string; name: string; slug: string; is_system: boolean; organization_id: string; }
interface AppPermission { key: string; name: string; }

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function RolePermissionManager() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<AppPermission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [rolePermSet, setRolePermSet] = useState<Set<string>>(new Set());
  const [newRoleName, setNewRoleName] = useState("");

  const selectedRole = useMemo(() => roles.find(r => r.id === selectedRoleId) || null, [roles, selectedRoleId]);

  useEffect(() => {
    (async () => {
      const [{ data: perms }, { data: rolesData }] = await Promise.all([
        supabase.from("app_permissions").select("key,name").order("key"),
        supabase.from("roles").select("id,name,slug,is_system,organization_id").order("name"),
      ]);
      setPermissions(perms || []);
      setRoles(rolesData || []);
      if ((rolesData || []).length && !selectedRoleId) setSelectedRoleId(rolesData![0].id);
    })();
  }, []);

  useEffect(() => {
    if (!selectedRoleId) return;
    (async () => {
      const { data } = await supabase.from("role_permissions").select("permission_key").eq("role_id", selectedRoleId);
      setRolePermSet(new Set((data || []).map((d) => d.permission_key)));
    })();
  }, [selectedRoleId]);

  const handleCreateRole = async () => {
    if (!user || !newRoleName.trim()) return;
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organizacao_id")
        .eq("id", user.id)
        .maybeSingle();
      const orgId = profile?.organizacao_id;
      if (!orgId) throw new Error("Organização não encontrada no seu perfil");

      const newSlug = slugify(newRoleName);
      const { data, error } = await supabase
        .from("roles")
        .insert({ name: newRoleName.trim(), slug: newSlug, organization_id: orgId })
        .select("id,name,slug,is_system,organization_id")
        .single();
      if (error) throw error;
      setRoles((prev) => [...prev, data!].sort((a,b)=>a.name.localeCompare(b.name)));
      setSelectedRoleId(data!.id);
      setNewRoleName("");
      toast({ title: "Cargo criado", description: `"${data!.name}" criado com sucesso.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message || "Falha ao criar cargo" });
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (permKey: string, checked: boolean) => {
    if (!selectedRoleId) return;
    setLoading(true);
    try {
      if (checked) {
        const { error } = await supabase.from("role_permissions").insert({ role_id: selectedRoleId, permission_key: permKey });
        if (error) throw error;
        setRolePermSet((prev) => new Set(prev).add(permKey));
      } else {
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role_id", selectedRoleId)
          .eq("permission_key", permKey);
        if (error) throw error;
        const next = new Set(rolePermSet);
        next.delete(permKey);
        setRolePermSet(next);
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message || "Falha ao atualizar permissão" });
    } finally {
      setLoading(false);
    }
  };

  const assignMeToRole = async () => {
    if (!user || !selectedRole) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("user_role_assignments").insert({
        user_id: user.id,
        role_id: selectedRole.id,
        organization_id: selectedRole.organization_id,
      });
      if (error) throw error;
      toast({ title: "Atribuído ao cargo", description: `Você agora é ${selectedRole.name}.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message || "Falha ao atribuir" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PermissionGate required="configuracoes:manage_roles">
      <Card>
        <CardHeader>
          <CardTitle>Cargos e Permissões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Roles list */}
            <div>
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Nome do cargo (ex.: Operador)"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                />
                <Button onClick={handleCreateRole} disabled={loading || !newRoleName.trim()}>
                  Criar
                </Button>
              </div>
              <div className="border rounded-md divide-y">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoleId(r.id)}
                    className={`w-full text-left px-3 py-2 hover:bg-accent/5 ${r.id === selectedRoleId ? "bg-accent/10" : ""}`}
                  >
                    {r.name}
                  </button>
                ))}
                {roles.length === 0 && (
                  <div className="px-3 py-4 text-sm text-muted-foreground">Nenhum cargo ainda. Crie o primeiro acima.</div>
                )}
              </div>
            </div>

            {/* Permissions for selected role */}
            <div className="md:col-span-2">
              {selectedRole ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-lg font-medium">{selectedRole.name}</div>
                      <div className="text-sm text-muted-foreground">Defina o que este cargo pode acessar</div>
                    </div>
                    <Button variant="secondary" onClick={assignMeToRole} disabled={loading}>
                      Tornar-me membro
                    </Button>
                  </div>
                  <Separator className="my-3" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {permissions.map((p) => (
                      <label key={p.key} className="flex items-center gap-2 p-2 border rounded-md">
                        <Checkbox
                          checked={rolePermSet.has(p.key)}
                          onCheckedChange={(val) => togglePermission(p.key, Boolean(val))}
                        />
                        <span className="text-sm">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Selecione um cargo para editar as permissões.</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </PermissionGate>
  );
}

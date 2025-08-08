import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function usePermissions() {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery<string[]>({
    queryKey: ["permissions", user?.id],
    enabled: !!user,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.rpc("get_user_permissions");
      if (error) {
        console.error("Erro ao carregar permissões:", error.message);
        return [];
      }
      return data ?? [];
    },
  });

  const hasPermission = (required: string | string[], requireAll = false) => {
    const set = new Set(data ?? []);
    if (Array.isArray(required)) {
      return requireAll ? required.every((p) => set.has(p)) : required.some((p) => set.has(p));
    }
    return set.has(required);
  };

  return { permissions: data ?? [], isLoading, hasPermission, refetch };
}

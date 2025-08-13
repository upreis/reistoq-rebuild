import { supabase } from "@/integrations/supabase/client";

export async function adminListProfiles(search?: string) {
  return supabase.rpc("admin_list_profiles", { _search: search ?? null });
}
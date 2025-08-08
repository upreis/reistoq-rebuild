import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface Notification {
  id: string;
  kind: "info" | "success" | "warning" | "destructive";
  message: string;
  href?: string;
  link_label?: string;
  type: "system_alert" | "announcement";
  priority?: number;
  target_routes?: string[];
}

const DISMISSED_KEY = "reistoq.notification.dismissed";

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

export function useNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dismissed, setDismissed] = usePersistentState<string[]>(DISMISSED_KEY, []);
  const [loading, setLoading] = useState(false);

  // Buscar notificações do backend
  const fetchNotifications = async (): Promise<Notification[]> => {
    if (!user) return [];
    
    try {
      setLoading(true);
      
      // Buscar alertas do sistema ativos
      const { data: systemAlerts, error: systemError } = await supabase
        .from("system_alerts")
        .select("*")
        .eq("active", true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (systemError) {
        console.error("Erro ao buscar alertas do sistema:", systemError);
      }

      // Buscar anúncios ativos
      const { data: announcements, error: announcementError } = await supabase
        .from("announcements")
        .select("*")
        .eq("active", true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false });

      if (announcementError) {
        console.error("Erro ao buscar anúncios:", announcementError);
      }

      // Converter para formato padrão
      const notifications: Notification[] = [
        ...(systemAlerts || []).map((alert) => ({
          id: alert.id,
          kind: alert.kind as "info" | "success" | "warning" | "destructive",
          message: alert.message,
          href: alert.href || undefined,
          link_label: alert.link_label || undefined,
          type: "system_alert" as const,
          priority: alert.priority,
        })),
        ...(announcements || []).map((announcement) => ({
          id: announcement.id,
          kind: announcement.kind as "info" | "success" | "warning" | "destructive",
          message: announcement.message,
          href: announcement.href || undefined,
          link_label: announcement.link_label || undefined,
          type: "announcement" as const,
          priority: 0,
          target_routes: announcement.target_routes || undefined,
        })),
      ];

      // Filtrar notificações não dispensadas pelo usuário
      return notifications.filter((n) => !dismissed.includes(n.id));
    } catch (error) {
      console.error("Erro ao buscar notificações:", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Salvar anúncio no backend
  const saveAnnouncement = async (announcement: {
    kind: "info" | "success" | "warning" | "destructive";
    message: string;
    href?: string;
    link_label?: string;
  }) => {
    if (!user) {
      toast({ 
        title: "Erro", 
        description: "Usuário não autenticado",
        variant: "destructive" 
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("announcements")
        .insert({
          created_by: user.id,
          kind: announcement.kind,
          message: announcement.message,
          href: announcement.href || null,
          link_label: announcement.link_label || null,
          active: true,
        });

      if (error) {
        throw error;
      }

      toast({ 
        title: "Sucesso", 
        description: "Anúncio criado com sucesso!" 
      });
    } catch (error) {
      console.error("Erro ao salvar anúncio:", error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível salvar o anúncio",
        variant: "destructive" 
      });
    }
  };

  // Remover anúncio do backend
  const removeAnnouncement = async (id: string) => {
    try {
      const { error } = await supabase
        .from("announcements")
        .update({ active: false })
        .eq("id", id);

      if (error) {
        throw error;
      }

      toast({ 
        title: "Sucesso", 
        description: "Anúncio removido com sucesso!" 
      });
    } catch (error) {
      console.error("Erro ao remover anúncio:", error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível remover o anúncio",
        variant: "destructive" 
      });
    }
  };

  // Dispensar notificação (salvar localmente e no backend)
  const dismissNotification = async (id: string, type: "system_alert" | "announcement") => {
    // Salvar localmente para efeito imediato
    setDismissed(prev => [...prev, id]);

    // Salvar no backend para persistência entre dispositivos
    if (user) {
      try {
        await supabase
          .from("user_dismissed_notifications")
          .insert({
            user_id: user.id,
            notification_type: type,
            notification_id: id,
          });
      } catch (error) {
        console.error("Erro ao salvar dispensa no backend:", error);
        // Falha silenciosa - a notificação já foi dispensada localmente
      }
    }
  };

  return {
    fetchNotifications,
    saveAnnouncement,
    removeAnnouncement,
    dismissNotification,
    loading,
    dismissed,
  };
}
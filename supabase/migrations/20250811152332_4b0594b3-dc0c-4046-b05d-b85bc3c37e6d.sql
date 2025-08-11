-- Fix linter: set immutable search_path for function without it
CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Remover alertas do sistema expirados
  DELETE FROM public.system_alerts 
  WHERE expires_at IS NOT NULL AND expires_at < now();
  
  -- Remover anúncios expirados
  DELETE FROM public.announcements 
  WHERE expires_at IS NOT NULL AND expires_at < now();
  
  -- Remover registros de dispensas de notificações que não existem mais
  DELETE FROM public.user_dismissed_notifications 
  WHERE (notification_type = 'system_alert' AND notification_id NOT IN (SELECT id FROM public.system_alerts))
     OR (notification_type = 'announcement' AND notification_id NOT IN (SELECT id FROM public.announcements));
END;
$function$;
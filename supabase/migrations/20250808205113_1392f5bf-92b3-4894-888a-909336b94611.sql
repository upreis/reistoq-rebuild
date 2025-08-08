-- Criar tabelas para sistema de notificações
CREATE TABLE public.system_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('info', 'success', 'warning', 'destructive')),
  message TEXT NOT NULL,
  href TEXT,
  link_label TEXT,
  priority INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para anúncios manuais dos administradores
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('info', 'success', 'warning', 'destructive')),
  message TEXT NOT NULL,
  href TEXT,
  link_label TEXT,
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para rastrear notificações dispensadas por usuário
CREATE TABLE public.user_dismissed_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  notification_type TEXT NOT NULL, -- 'system_alert' ou 'announcement'
  notification_id UUID NOT NULL,
  dismissed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_type, notification_id)
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_dismissed_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para system_alerts (somente leitura para todos usuários autenticados)
CREATE POLICY "Users can view active system alerts" 
ON public.system_alerts 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND active = true AND (expires_at IS NULL OR expires_at > now()));

-- Políticas para announcements
CREATE POLICY "Users can view active announcements" 
ON public.announcements 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Admins can manage announcements" 
ON public.announcements 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Políticas para user_dismissed_notifications
CREATE POLICY "Users can view their own dismissed notifications" 
ON public.user_dismissed_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can dismiss their own notifications" 
ON public.user_dismissed_notifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Triggers para updated_at
CREATE TRIGGER update_system_alerts_updated_at
BEFORE UPDATE ON public.system_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir alguns alertas de exemplo do sistema
INSERT INTO public.system_alerts (kind, message, priority) VALUES
('info', 'Sistema de alertas ativado com sucesso!', 1),
('warning', 'Manutenção programada para domingo às 2h da manhã.', 2);

-- Criar função para limpar notificações expiradas
CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agendar limpeza diária de notificações expiradas
SELECT cron.schedule(
  'cleanup-expired-notifications',
  '0 3 * * *', -- Todo dia às 3h da manhã
  $$SELECT public.cleanup_expired_notifications();$$
);
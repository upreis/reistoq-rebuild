-- Criar tabela para controlar o estado dos processos de sincronização
CREATE TABLE IF NOT EXISTS public.sync_control (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'paused', 'stopped')),
  progress JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sync_control ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Permitir acesso total ao controle de sync" 
ON public.sync_control 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Insert default sync control records
INSERT INTO public.sync_control (process_name, status) VALUES 
  ('sync-pedidos-rapido', 'idle'),
  ('sync-pedidos-incremental', 'idle')
ON CONFLICT (process_name) DO NOTHING;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_sync_control_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sync_control_updated_at
  BEFORE UPDATE ON public.sync_control
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sync_control_updated_at();
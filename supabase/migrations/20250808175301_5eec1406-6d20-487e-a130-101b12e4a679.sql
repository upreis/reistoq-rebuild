-- Ensure extensions schema exists (idempotent)
create schema if not exists extensions;

-- Enable pg_cron in extensions schema
create extension if not exists pg_cron with schema extensions;

-- Unschedule existing jobs to avoid duplicates (safe if they don't exist)
select cron.unschedule('sync-automatico-cada-minuto');
select cron.unschedule('cron-alertas-estoque-cada-10-min');
select cron.unschedule('cron-alertas-depara-cada-10-min');
select cron.unschedule('alertas-inteligentes-horario');

-- Schedule: sync-automatico every minute (the function self-throttles via configuracoes)
select cron.schedule(
  'sync-automatico-cada-minuto',
  '* * * * *',
  $$
  select
    net.http_post(
      url := 'https://tdjyfqnxvjgossuncpwm.supabase.co/functions/v1/sync-automatico',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkanlmcW54dmpnb3NzdW5jcHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTczNTMsImV4cCI6MjA2OTQ3MzM1M30.qrEBpARgfuWF74zHoRzGJyWjgxN_oCG5DdKjPVGJYxk"}'::jsonb,
      body := '{"trigger":"cron"}'::jsonb
    ) as request_id;
  $$
);

-- Schedule: cron-alertas-estoque every 10 minutes (respects configuracoes.alertas_automaticos)
select cron.schedule(
  'cron-alertas-estoque-cada-10-min',
  '*/10 * * * *',
  $$
  select
    net.http_post(
      url := 'https://tdjyfqnxvjgossuncpwm.supabase.co/functions/v1/cron-alertas-estoque',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkanlmcW54dmpnb3NzdW5jcHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTczNTMsImV4cCI6MjA2OTQ3MzM1M30.qrEBpARgfuWF74zHoRzGJyWjgxN_oCG5DdKjPVGJYxk"}'::jsonb,
      body := '{"trigger":"cron"}'::jsonb
    ) as request_id;
  $$
);

-- Schedule: cron-alertas-depara every 10 minutes (respects configuracoes.alertas_automaticos_depara)
select cron.schedule(
  'cron-alertas-depara-cada-10-min',
  '*/10 * * * *',
  $$
  select
    net.http_post(
      url := 'https://tdjyfqnxvjgossuncpwm.supabase.co/functions/v1/cron-alertas-depara',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkanlmcW54dmpnb3NzdW5jcHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTczNTMsImV4cCI6MjA2OTQ3MzM1M30.qrEBpARgfuWF74zHoRzGJyWjgxN_oCG5DdKjPVGJYxk"}'::jsonb,
      body := '{"trigger":"cron"}'::jsonb
    ) as request_id;
  $$
);

-- Schedule: alertas-inteligentes hourly
select cron.schedule(
  'alertas-inteligentes-horario',
  '0 * * * *',
  $$
  select
    net.http_post(
      url := 'https://tdjyfqnxvjgossuncpwm.supabase.co/functions/v1/alertas-inteligentes',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkanlmcW54dmpnb3NzdW5jcHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTczNTMsImV4cCI6MjA2OTQ3MzM1M30.qrEBpARgfuWF74zHoRzGJyWjgxN_oCG5DdKjPVGJYxk"}'::jsonb,
      body := '{"trigger":"cron"}'::jsonb
    ) as request_id;
  $$
);
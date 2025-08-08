-- Create announcements table if it doesn't exist and ensure columns
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid not null,
  organization_id uuid,
  kind text not null check (kind in ('info','success','warning','destructive')),
  message text not null,
  href text,
  link_label text,
  active boolean not null default true,
  expires_at timestamptz,
  target_routes text[]
);

-- Create system_alerts if missing (referenced by code). Minimal schema to avoid errors.
create table if not exists public.system_alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('info','success','warning','destructive')),
  message text not null,
  href text,
  link_label text,
  priority int default 0,
  active boolean not null default true,
  expires_at timestamptz
);

-- Table to persist dismissed notifications if it doesn't exist
create table if not exists public.user_dismissed_notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null,
  notification_type text not null check (notification_type in ('system_alert','announcement')),
  notification_id text not null
);

-- Enable RLS
alter table public.announcements enable row level security;
alter table public.system_alerts enable row level security;
alter table public.user_dismissed_notifications enable row level security;

-- Helper function to set organization_id from current user's profile or JWT
create or replace function public.current_organization_id()
returns uuid
language sql
stable
as $$
  select
    coalesce(
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'organization_id',
      null
    )::uuid;
$$;

-- Trigger to set organization_id on announcements when null
create or replace function public.set_announcement_org()
returns trigger
language plpgsql
as $$
begin
  if NEW.organization_id is null then
    NEW.organization_id := public.current_organization_id();
  end if;
  return NEW;
end;
$$;

-- Create trigger if not exists (drop/create pattern to be idempotent)
drop trigger if exists trg_set_announcement_org on public.announcements;
create trigger trg_set_announcement_org
before insert on public.announcements
for each row execute function public.set_announcement_org();

-- Basic RLS policies
-- Announcements: allow read for users in same org or public (null org)
create policy if not exists "Announcements readable by org"
  on public.announcements
  for select
  using (
    organization_id is null
    or organization_id = public.current_organization_id()
  );

-- Allow insert/update/delete to users with system:announce permission; fallback to creators
-- We assume a helper function has_permission(text) exists; if not, keep creator-only control
create or replace function public.has_permission(perm text)
returns boolean
language sql
stable
as $$
  -- Try to read from JWT claim x-permissions (array of strings)
  select exists (
    select 1
    where (nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'app_permissions') ? perm
  );
$$;

create policy if not exists "Announcements insert by announcers"
  on public.announcements
  for insert
  with check (
    public.has_permission('system:announce')
    and (organization_id is null or organization_id = public.current_organization_id())
  );

create policy if not exists "Announcements update by announcers or creator"
  on public.announcements
  for update
  using (
    (created_by = auth.uid())
    or public.has_permission('system:announce')
  )
  with check (
    (organization_id is null or organization_id = public.current_organization_id())
  );

create policy if not exists "Announcements delete by announcers or creator"
  on public.announcements
  for delete
  using (
    (created_by = auth.uid())
    or public.has_permission('system:announce')
  );

-- Dismissed notifications: user can manage their own rows
create policy if not exists "Dismissed select own"
  on public.user_dismissed_notifications
  for select
  using (user_id = auth.uid());

create policy if not exists "Dismissed insert own"
  on public.user_dismissed_notifications
  for insert
  with check (user_id = auth.uid());

-- System alerts are read-only and public (active filtering handled in app)
create policy if not exists "System alerts readable"
  on public.system_alerts
  for select
  using (true);

-- Permissions model: add system:announce permission and grant to admin roles if tables exist
-- Create app_permissions if not exists
create table if not exists public.app_permissions (
  key text primary key,
  description text
);

insert into public.app_permissions(key, description)
values ('system:announce', 'Criar e gerenciar anúncios do sistema')
on conflict (key) do nothing;

-- Roles and role_permissions tables (create if missing)
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null
);

create table if not exists public.role_permissions (
  role_id uuid references public.roles(id) on delete cascade,
  permission_key text references public.app_permissions(key) on delete cascade,
  primary key (role_id, permission_key)
);

-- Grant to admin-like roles if present
insert into public.role_permissions(role_id, permission_key)
select r.id, 'system:announce'
from public.roles r
where r.key in ('admin', 'owner', 'super_admin')
on conflict do nothing;

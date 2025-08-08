-- Ensure announcements table has required columns
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid not null,
  kind text not null check (kind in ('info','success','warning','destructive')),
  message text not null,
  href text,
  link_label text,
  active boolean not null default true,
  expires_at timestamptz
);

alter table public.announcements add column if not exists organization_id uuid;
alter table public.announcements add column if not exists target_routes text[];

alter table public.announcements enable row level security;

drop trigger if exists trg_set_announcement_org on public.announcements;
create trigger trg_set_announcement_org
before insert on public.announcements
for each row execute function public.set_announcement_org();

-- Policies: drop/recreate
drop policy if exists "Announcements readable by org" on public.announcements;
drop policy if exists "Announcements insert by announcers" on public.announcements;
drop policy if exists "Announcements update by announcers or creator" on public.announcements;
drop policy if exists "Announcements delete by announcers or creator" on public.announcements;

create policy "Announcements readable by org"
  on public.announcements
  for select
  using (
    organization_id is null
    or organization_id = public.get_current_org_id()
  );

create policy "Announcements insert by announcers"
  on public.announcements
  for insert
  with check (
    public.has_permission('system:announce')
    and (organization_id is null or organization_id = public.get_current_org_id())
  );

create policy "Announcements update by announcers or creator"
  on public.announcements
  for update
  using (
    (created_by = auth.uid())
    or public.has_permission('system:announce')
  )
  with check (
    (organization_id is null or organization_id = public.get_current_org_id())
  );

create policy "Announcements delete by announcers or creator"
  on public.announcements
  for delete
  using (
    (created_by = auth.uid())
    or public.has_permission('system:announce')
  );

-- Add permission with required columns
insert into public.app_permissions(key, name, description)
values ('system:announce', 'Gerenciar anúncios', 'Criar e gerenciar anúncios do sistema')
on conflict (key) do nothing;

insert into public.role_permissions(role_id, permission_key)
select r.id, 'system:announce'
from public.roles r
where r.slug = 'admin'
on conflict do nothing;
-- Deletar UMA venda (escopo por organização)
create or replace function public.hv_delete(_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  delete from public.historico_vendas hv
  using public.integration_accounts ia
  where hv.id = _id
    and ia.id = hv.integration_account_id
    and ia.organization_id = public.get_current_org_id();
end; $$;

revoke all on function public.hv_delete(uuid) from public, anon;
grant execute on function public.hv_delete(uuid) to authenticated;

-- Deletar VARIAS vendas (escopo por organização)
create or replace function public.hv_delete_many(_ids uuid[])
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  delete from public.historico_vendas hv
  using public.integration_accounts ia
  where hv.id = any(_ids)
    and ia.id = hv.integration_account_id
    and ia.organization_id = public.get_current_org_id();
end; $$;

revoke all on function public.hv_delete_many(uuid[]) from public, anon;
grant execute on function public.hv_delete_many(uuid[]) to authenticated;
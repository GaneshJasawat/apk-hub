create schema if not exists private;

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
      and _user_id = auth.uid()
  )
$$;

revoke all on function private.has_role(uuid, public.app_role) from public;
grant execute on function private.has_role(uuid, public.app_role) to anon, authenticated;

alter policy "screenshots_admin_delete" on public.app_screenshots
  using (private.has_role(auth.uid(), 'admin'::public.app_role));

alter policy "apps_admin_delete" on public.apps
  using (private.has_role(auth.uid(), 'admin'::public.app_role));

alter policy "apps_admin_update" on public.apps
  using (private.has_role(auth.uid(), 'admin'::public.app_role));

alter policy "user_roles_select_self_or_admin" on public.user_roles
  using ((auth.uid() = user_id) or private.has_role(auth.uid(), 'admin'::public.app_role));

alter policy "user_roles_admin_manage" on public.user_roles
  using (private.has_role(auth.uid(), 'admin'::public.app_role))
  with check (private.has_role(auth.uid(), 'admin'::public.app_role));

revoke all on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
drop function if exists public.has_role(uuid, public.app_role);

-- Role enum + table
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Security-definer role check (avoids recursive RLS)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

revoke execute on function public.has_role(uuid, public.app_role) from public;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, anon;

-- RLS for user_roles: users can view their own, admins can view/manage all
create policy "user_roles_select_self_or_admin" on public.user_roles
  for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "user_roles_admin_manage" on public.user_roles
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Auto-grant admin to the seed email; everyone else gets 'user'
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));

  if lower(new.email) = 'ganeshjasawat4@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
    on conflict do nothing;
  else
    insert into public.user_roles (user_id, role) values (new.id, 'user')
    on conflict do nothing;
  end if;
  return new;
end; $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- If the admin user already exists, grant the role retroactively
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role from auth.users
where lower(email) = 'ganeshjasawat4@gmail.com'
on conflict do nothing;

-- Let admins manage any app / screenshot
create policy "apps_admin_update" on public.apps for update
  using (public.has_role(auth.uid(), 'admin'));
create policy "apps_admin_delete" on public.apps for delete
  using (public.has_role(auth.uid(), 'admin'));

create policy "screenshots_admin_delete" on public.app_screenshots for delete
  using (public.has_role(auth.uid(), 'admin'));

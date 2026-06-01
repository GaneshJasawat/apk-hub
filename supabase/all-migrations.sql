
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Apps
create table public.apps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  package_name text,
  description text not null default '',
  short_description text,
  category text not null default 'Other',
  version text,
  icon_url text,
  apk_url text,
  video_url text,
  downloads integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.apps enable row level security;
create policy "apps_select_all" on public.apps for select using (true);
create policy "apps_insert_own" on public.apps for insert with check (auth.uid() = user_id);
create policy "apps_update_own" on public.apps for update using (auth.uid() = user_id);
create policy "apps_delete_own" on public.apps for delete using (auth.uid() = user_id);

create index apps_user_idx on public.apps(user_id);
create index apps_category_idx on public.apps(category);

-- Screenshots
create table public.app_screenshots (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  image_url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.app_screenshots enable row level security;
create policy "screenshots_select_all" on public.app_screenshots for select using (true);
create policy "screenshots_insert_owner" on public.app_screenshots for insert
  with check (exists (select 1 from public.apps a where a.id = app_id and a.user_id = auth.uid()));
create policy "screenshots_delete_owner" on public.app_screenshots for delete
  using (exists (select 1 from public.apps a where a.id = app_id and a.user_id = auth.uid()));

create index screenshots_app_idx on public.app_screenshots(app_id);

-- Storage buckets
insert into storage.buckets (id, name, public) values
  ('icons','icons',true),
  ('screenshots','screenshots',true),
  ('videos','videos',true),
  ('apks','apks',true);

-- Storage policies: public read, authenticated upload, owner manage
create policy "public_read_assets" on storage.objects for select
  using (bucket_id in ('icons','screenshots','videos','apks'));

create policy "auth_upload_assets" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('icons','screenshots','videos','apks')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owner_update_assets" on storage.objects for update to authenticated
  using (
    bucket_id in ('icons','screenshots','videos','apks')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owner_delete_assets" on storage.objects for delete to authenticated
  using (
    bucket_id in ('icons','screenshots','videos','apks')
    and (storage.foldername(name))[1] = auth.uid()::text
  );


revoke execute on function public.handle_new_user() from public, anon, authenticated;


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


create or replace function public.increment_app_downloads(_app_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.apps
  set downloads = downloads + 1,
      updated_at = now()
  where id = _app_id;
$$;

grant execute on function public.increment_app_downloads(uuid) to anon, authenticated;

revoke execute on function public.increment_app_downloads(uuid) from anon, authenticated;
drop function if exists public.increment_app_downloads(uuid);

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


CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  language text,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  zip_path text,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX repositories_user_id_idx ON public.repositories(user_id);
CREATE INDEX repositories_visibility_idx ON public.repositories(visibility);

GRANT SELECT ON public.repositories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repositories TO authenticated;
GRANT ALL ON public.repositories TO service_role;

ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repos_select_public_or_owner_or_admin"
  ON public.repositories FOR SELECT
  USING (
    visibility = 'public'
    OR auth.uid() = user_id
    OR private.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "repos_insert_own"
  ON public.repositories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "repos_update_own_or_admin"
  ON public.repositories FOR UPDATE
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));

CREATE POLICY "repos_delete_own_or_admin"
  ON public.repositories FOR DELETE
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER repositories_set_updated_at
  BEFORE UPDATE ON public.repositories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
VALUES ('repos', 'repos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "repos_storage_select_owner_or_admin"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'repos'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR private.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "repos_storage_insert_owner"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'repos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "repos_storage_update_owner"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'repos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "repos_storage_delete_owner_or_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'repos'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR private.has_role(auth.uid(), 'admin')
    )
  );


ALTER TABLE public.apps ADD COLUMN app_type text NOT NULL DEFAULT 'apk' CHECK (app_type IN ('apk', 'weblink'));
ALTER TABLE public.apps ADD COLUMN web_url text;


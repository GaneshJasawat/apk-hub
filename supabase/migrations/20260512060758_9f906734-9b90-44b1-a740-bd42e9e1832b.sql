
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

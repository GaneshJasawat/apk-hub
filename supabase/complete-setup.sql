-- =============================================================
-- ApkHub Complete Supabase Setup
-- =============================================================
-- Run this file in your Supabase SQL Editor:
--   https://supabase.com/dashboard/project/woxvwvzvzclwnwkqhcsu/sql/new
-- =============================================================

-- 1. Storage buckets
insert into storage.buckets (id, name, public) values
  ('icons','icons',true),
  ('screenshots','screenshots',true),
  ('videos','videos',true),
  ('apks','apks',true),
  ('repos','repos',false)
on conflict (id) do nothing;

-- 2. Storage policies for asset buckets
drop policy if exists "public_read_assets" on storage.objects;
create policy "public_read_assets" on storage.objects for select
  using (bucket_id in ('icons','screenshots','videos','apks'));

drop policy if exists "auth_upload_assets" on storage.objects;
create policy "auth_upload_assets" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('icons','screenshots','videos','apks')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "owner_update_assets" on storage.objects;
create policy "owner_update_assets" on storage.objects for update to authenticated
  using (
    bucket_id in ('icons','screenshots','videos','apks')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "owner_delete_assets" on storage.objects;
create policy "owner_delete_assets" on storage.objects for delete to authenticated
  using (
    bucket_id in ('icons','screenshots','videos','apks')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Increase file size limit
--    Go to: Project Settings → API → Storage → Max Upload File Size
--    Set to at least 500000000 (500 MB)

-- 4. Verify
select id, name, public from storage.buckits where id in ('icons','screenshots','videos','apks','repos');

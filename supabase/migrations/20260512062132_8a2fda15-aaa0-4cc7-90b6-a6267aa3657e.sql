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
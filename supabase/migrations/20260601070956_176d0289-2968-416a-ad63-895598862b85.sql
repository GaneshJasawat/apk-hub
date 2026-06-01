
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

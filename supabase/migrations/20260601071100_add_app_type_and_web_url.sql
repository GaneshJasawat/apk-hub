ALTER TABLE public.apps ADD COLUMN app_type text NOT NULL DEFAULT 'apk' CHECK (app_type IN ('apk', 'weblink'));
ALTER TABLE public.apps ADD COLUMN web_url text;

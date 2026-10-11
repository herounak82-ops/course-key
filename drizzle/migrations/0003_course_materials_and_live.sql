ALTER TABLE public.learning_items ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS learning_items_course_idx ON public.learning_items(course_id);

CREATE OR REPLACE FUNCTION public.inherit_learning_course()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT course_id INTO NEW.course_id FROM public.learning_items WHERE id = NEW.parent_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_learning_inherit_course BEFORE INSERT OR UPDATE ON public.learning_items
FOR EACH ROW EXECUTE FUNCTION public.inherit_learning_course();

CREATE OR REPLACE FUNCTION public.can_access_course(_course uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1 FROM public.user_access WHERE user_id = auth.uid() AND course_id = _course AND status = 'active')
$$;

-- Hide the secret link column; expose it only through checked functions
REVOKE SELECT ON public.learning_items FROM anon, authenticated;
GRANT SELECT (id, title, description, category, kind, sort_order, is_published, created_at, parent_id, mime_type, size_bytes, course_id) ON public.learning_items TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.list_learning(_course uuid DEFAULT NULL)
RETURNS TABLE (id uuid, title text, description text, kind text, ref text, sort_order int, is_published boolean, parent_id uuid, mime_type text, size_bytes bigint, course_id uuid, locked boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH ok AS (SELECT (_course IS NULL OR public.can_access_course(_course)) AS a, public.has_role(auth.uid(),'admin') AS adm)
  SELECT li.id, li.title, li.description, li.kind,
         CASE WHEN ok.a THEN li.ref ELSE NULL END,
         li.sort_order, li.is_published, li.parent_id, li.mime_type, li.size_bytes, li.course_id, NOT ok.a
  FROM public.learning_items li, ok
  WHERE li.course_id IS NOT DISTINCT FROM _course AND (li.is_published OR ok.adm)
  ORDER BY li.sort_order, li.title
$$;

CREATE OR REPLACE FUNCTION public.get_learning_ref(_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT li.ref FROM public.learning_items li
  WHERE li.id = _id AND (li.is_published OR public.has_role(auth.uid(),'admin'))
    AND (li.course_id IS NULL OR public.can_access_course(li.course_id))
$$;

CREATE OR REPLACE FUNCTION public.can_read_study_object(_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.learning_items li
    WHERE li.kind = 'upload' AND li.ref = _name AND li.is_published
      AND (li.course_id IS NULL OR public.can_access_course(li.course_id)))
$$;

DROP POLICY IF EXISTS "study files read" ON storage.objects;
CREATE POLICY "study files read checked" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'study-files' AND public.can_read_study_object(name));

-- Hide course video ids from non-buyers
REVOKE SELECT ON public.courses FROM anon, authenticated;
GRANT SELECT (id, title, description, price, category, thumbnail_url, is_published, created_at, updated_at) ON public.courses TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_course_media(_id uuid)
RETURNS TABLE (youtube_video_id text, youtube_playlist_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.youtube_video_id, c.youtube_playlist_id FROM public.courses c
  WHERE c.id = _id AND public.can_access_course(_id)
$$;

-- Live sessions added manually by admin
CREATE TABLE public.live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  video_id text NOT NULL,
  thumbnail_url text,
  scheduled_at timestamptz,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.live_sessions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.live_sessions TO authenticated;
GRANT ALL ON public.live_sessions TO service_role;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read published live" ON public.live_sessions FOR SELECT TO authenticated
USING (is_published OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage live" ON public.live_sessions FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.yt_cache (
  key text PRIMARY KEY,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.yt_cache TO service_role;
ALTER TABLE public.yt_cache ENABLE ROW LEVEL SECURITY;
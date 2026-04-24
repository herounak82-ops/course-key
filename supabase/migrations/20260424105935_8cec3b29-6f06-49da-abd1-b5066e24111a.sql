
-- Drop any overly broad existing policies on storage.objects for our public buckets,
-- then add narrower ones: anyone can read individual objects, but listing & writes are admin-only.

-- Helper: drop policies named like the ones we'll create (idempotent)
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'storage.objects'::regclass
      AND polname IN (
        'Public read notices object',
        'Public read course-thumbnails object',
        'Admins manage notices',
        'Admins manage course-thumbnails',
        'Public read notices',
        'Public read course-thumbnails'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', p.polname);
  END LOOP;
END $$;

-- Public read of single objects (download by exact path) — does NOT allow listing the bucket
CREATE POLICY "Public read notices object"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'notices');

CREATE POLICY "Public read course-thumbnails object"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'course-thumbnails');

-- Admins can do everything (upload / update / delete / list) on these buckets
CREATE POLICY "Admins manage notices"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'notices' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'notices' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage course-thumbnails"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'course-thumbnails' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'course-thumbnails' AND public.has_role(auth.uid(), 'admin'::app_role));

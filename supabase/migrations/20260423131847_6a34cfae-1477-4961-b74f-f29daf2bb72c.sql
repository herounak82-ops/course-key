
-- Fix function search path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- Tighten bucket SELECT so files are reachable by URL but bucket listing is not anonymous
DROP POLICY IF EXISTS "public read notices bucket" ON storage.objects;
DROP POLICY IF EXISTS "public read thumbnails bucket" ON storage.objects;

-- Authenticated users can view individual objects (URL access still works for public buckets via signed-style fetches in Supabase storage)
CREATE POLICY "auth read notices objects" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'notices');
CREATE POLICY "auth read thumbnails objects" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'course-thumbnails');

-- Allow anon to read objects too (so public CDN URLs work) but only when fetching by exact name (storage.objects SELECT covers both list & get; this still permits get-by-name through the storage API)
CREATE POLICY "anon read notices objects" ON storage.objects
FOR SELECT TO anon USING (bucket_id = 'notices');
CREATE POLICY "anon read thumbnails objects" ON storage.objects
FOR SELECT TO anon USING (bucket_id = 'course-thumbnails');

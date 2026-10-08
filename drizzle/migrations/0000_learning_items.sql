CREATE TABLE public.learning_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'General',
  kind text NOT NULL DEFAULT 'drive_file',
  ref text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.learning_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_items TO authenticated;
GRANT ALL ON public.learning_items TO service_role;
ALTER TABLE public.learning_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read published learning" ON public.learning_items FOR SELECT TO anon, authenticated USING (is_published = true OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage learning" ON public.learning_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
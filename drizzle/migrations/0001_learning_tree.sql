ALTER TABLE public.learning_items ADD COLUMN parent_id uuid REFERENCES public.learning_items(id) ON DELETE CASCADE;
ALTER TABLE public.learning_items ADD COLUMN mime_type text;
ALTER TABLE public.learning_items ADD COLUMN size_bytes bigint;
CREATE INDEX learning_items_parent_idx ON public.learning_items(parent_id);
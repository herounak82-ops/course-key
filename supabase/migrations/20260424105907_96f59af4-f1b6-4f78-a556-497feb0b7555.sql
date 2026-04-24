
-- 1. Coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_percent int CHECK (discount_percent IS NULL OR (discount_percent BETWEEN 0 AND 100)),
  discount_amount numeric CHECK (discount_amount IS NULL OR discount_amount >= 0),
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read active coupons" ON public.coupons
  FOR SELECT TO authenticated
  USING (active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "admins manage coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Extra settings columns
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS map_embed_url text,
  ADD COLUMN IF NOT EXISTS youtube_url text DEFAULT 'https://www.youtube.com/@devstudypoint1993',
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text;

UPDATE public.app_settings
  SET youtube_url = COALESCE(youtube_url, 'https://www.youtube.com/@devstudypoint1993')
  WHERE id = 1;

-- 3. Updated handle_new_user trigger with hardcoded admin identities
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  hardcoded_emails text[] := ARRAY['yrounsk@gmail.com','devsharma19932@gmail.com'];
  hardcoded_phones text[] := ARRAY['+919871868560','+918979073262','9871868560','8979073262'];
  seed_email text;
  is_admin boolean := false;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email,''),'@',1)),
    NEW.phone
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT admin_seed_email INTO seed_email FROM public.app_settings WHERE id = 1;

  IF NEW.email IS NOT NULL AND lower(NEW.email) = ANY(hardcoded_emails) THEN
    is_admin := true;
  ELSIF NEW.phone IS NOT NULL AND NEW.phone = ANY(hardcoded_phones) THEN
    is_admin := true;
  ELSIF seed_email IS NOT NULL AND NEW.email IS NOT NULL AND lower(NEW.email) = lower(seed_email) THEN
    is_admin := true;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN is_admin THEN 'admin'::app_role ELSE 'student'::app_role END)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Make sure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill admin role for existing matching users
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE lower(COALESCE(email,'')) IN ('yrounsk@gmail.com','devsharma19932@gmail.com')
   OR phone IN ('+919871868560','+918979073262','9871868560','8979073262')
ON CONFLICT DO NOTHING;


-- ============== ENUMS ==============
CREATE TYPE public.app_role AS ENUM ('admin', 'student');
CREATE TYPE public.access_status AS ENUM ('pending', 'active');

-- ============== PROFILES ==============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============== USER ROLES ==============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role helper (SECURITY DEFINER avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============== COURSES ==============
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  category TEXT,
  thumbnail_url TEXT,
  youtube_video_id TEXT,
  youtube_playlist_id TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- ============== USER ACCESS ==============
CREATE TABLE public.user_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status public.access_status NOT NULL DEFAULT 'pending',
  transaction_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, course_id)
);
ALTER TABLE public.user_access ENABLE ROW LEVEL SECURITY;

-- ============== NOTICES ==============
CREATE TABLE public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- ============== APP SETTINGS (single row) ==============
CREATE TABLE public.app_settings (
  id INT PRIMARY KEY DEFAULT 1,
  upi_id TEXT NOT NULL DEFAULT 'devpanday19932@axl',
  upi_payee_name TEXT NOT NULL DEFAULT 'Dev Panday',
  admin_seed_email TEXT NOT NULL DEFAULT 'yrounsk@gmail.com',
  contact_phone TEXT,
  contact_email TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.app_settings (id) VALUES (1);

-- ============== TIMESTAMP TRIGGER ==============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_courses_updated BEFORE UPDATE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== SIGNUP HANDLER (creates profile + seeds admin) ==============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seed_email TEXT;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1))
  );

  SELECT admin_seed_email INTO seed_email FROM public.app_settings WHERE id = 1;

  IF seed_email IS NOT NULL AND lower(NEW.email) = lower(seed_email) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============== RLS POLICIES ==============

-- profiles
CREATE POLICY "users read own profile" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "admins read all profiles" ON public.profiles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users update own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id);

-- user_roles (read-only for users; admin-managed)
CREATE POLICY "users read own roles" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins read all roles" ON public.user_roles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- courses
CREATE POLICY "authenticated read courses" ON public.courses
FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins write courses" ON public.courses
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_access
CREATE POLICY "users read own access" ON public.user_access
FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins read all access" ON public.user_access
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users insert own access pending" ON public.user_access
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "admins update access" ON public.user_access
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete access" ON public.user_access
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- notices
CREATE POLICY "authenticated read notices" ON public.notices
FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins write notices" ON public.notices
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- app_settings
CREATE POLICY "authenticated read settings" ON public.app_settings
FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins update settings" ON public.app_settings
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============== STORAGE BUCKETS ==============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('notices', 'notices', true),
  ('course-thumbnails', 'course-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- public read for both buckets
CREATE POLICY "public read notices bucket" ON storage.objects
FOR SELECT USING (bucket_id = 'notices');
CREATE POLICY "public read thumbnails bucket" ON storage.objects
FOR SELECT USING (bucket_id = 'course-thumbnails');

-- admins can upload/update/delete in either bucket
CREATE POLICY "admins write notices bucket" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'notices' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update notices bucket" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'notices' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete notices bucket" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'notices' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins write thumbnails bucket" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'course-thumbnails' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update thumbnails bucket" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'course-thumbnails' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete thumbnails bucket" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'course-thumbnails' AND public.has_role(auth.uid(), 'admin'));

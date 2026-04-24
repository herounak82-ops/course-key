# Dev Study Point — Rebrand, Auth Upgrades, Enrollment Flow & UI Polish

A focused upgrade of the existing app: rebrand the shell, add a hamburger drawer + phone-OTP login, hardcode admin identities, rebuild the Home page with YouTube + socials + location, replace the direct QR with a proper enrollment + UPI deep-link flow (with coupons and a bottom-sheet animation), fix the broken course thumbnail upload + edit, and apply a glassmorphism polish.

---

## 1. Branding & Top Bar

- All visible copy already uses "Dev Study Point" — sweep for any stray "Course Key" / generic strings and fix.
- **TopBar redesign:**
  - Solid white background (`bg-white`), thin bottom border, soft drop shadow.
  - Larger logo (h-12 / md:h-14), with **Dev Study Point** wordmark always visible (not just on `sm:`).
  - Logo + wordmark wrapped in a `Link to="/"` (already is — keep).
  - Add a **hamburger button** (left on mobile, right on desktop next to Admin) that opens a `Sheet` (shadcn) drawer.
- **Drawer contents:** Home, All Courses, My Learning, Profile, Admin (if admin), and a **Logout** button at the bottom. Active route highlighted.
- Bottom nav stays for thumb reach on mobile; the hamburger is the secondary nav surface.

## 2. Authentication Upgrades

### Email signup UX
- On `auth.signUp`, detect existing-account responses (Supabase returns either an `error` containing "already" / "registered" **or** a success with `data.user.identities = []`). When detected:
  - Toast: **"Email Already Signed Up, please Login instead"**.
  - Programmatically switch the `Tabs` value to `login` and prefill the email.

### Phone + OTP login
- Add a third tab **Phone** alongside Login / Sign Up.
- Flow:
  1. User enters phone (E.164, default `+91` prefix) → `supabase.auth.signInWithOtp({ phone })`.
  2. Show 6-digit OTP input → `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`.
- **Setup needed (manual, after I scaffold the UI):** Lovable Cloud uses Supabase Auth; SMS OTP requires an SMS provider (Twilio/MessageBird/Vonage) configured in the backend Auth settings. I'll surface a clear `<lov-open-backend>` link with the steps, and the UI will gracefully show "SMS provider not configured" if `signInWithOtp` returns that error.

### Admin seeding (hardcoded identities)
- Update the existing `handle_new_user` trigger and add a small helper so these identities are always promoted to `admin` on signup, regardless of `app_settings.admin_seed_email`:
  - Email: `devsharma19932@gmail.com` (plus existing `yrounsk@gmail.com`)
  - Phones: `+919871868560`, `+918979073262`
- Also add a one-shot **backfill** migration: if any of these users already exist in `auth.users`, insert their admin role now.

### Session persistence
- Already handled — `supabase-js` defaults to `persistSession: true` with `localStorage`. No code change needed; I'll verify the client config and document it.

## 3. Home Page Enhancements

Add new sections below the existing hero / stats / notice board:

- **Latest from YouTube** — calls YouTube Data API v3 to fetch the channel's uploads playlist for `@devstudypoint1993`, displays the 6 latest videos as cards (thumb + title + date) that open the video in a modal player.
- **About Our Centre** — a write-up + 2-image collage using the teacher photos already in `src/assets/`.
- **Find Us** — address block + an embedded Google Maps `<iframe>` (no API key needed for the basic embed). Address text will be a placeholder you can edit in Admin → Settings (new fields).
- **Social strip + Footer** — YouTube, Facebook, Instagram icons linking out. Facebook page URL: I'll use `https://www.facebook.com/devstudypoint` as a sensible default and make it editable in Settings.

### YouTube key handling
- The provided key (`AIzaSy…WDdk`) will be stored as a **runtime secret** (`YOUTUBE_API_KEY`) and called from a tiny edge function `get-latest-videos` so the key isn't shipped to the browser. Frontend just calls the edge function and caches results with React Query.

## 4. Enrollment & UPI Flow

Replace the current "scroll down → QR + UTR form" with a structured flow:

1. **Course card → "Enroll Now"** button (on `/courses/:id`, shown only when no access exists).
2. **Payment Summary page** (`/courses/:id/checkout`):
   - Course title, instructor, price breakdown, **Coupon Code** input + "Apply" button.
   - Coupon validation: simple client-side check against a new `coupons` table (`code, discount_percent, discount_amount, active, expires_at`). RLS lets authenticated users read active coupons only.
   - "Continue to Payment" button at the bottom.
3. **Payment bottom sheet** (shadcn `Drawer`, `side="bottom"`, with `slide-in-up` animation):
   - "Redirecting to Payment App…" + animated 3-dot progress.
   - After ~700ms, sets `window.location.href = upi://pay?pa=devpanday19932@axl&pn=DevStudyPoint&cu=INR&am=<final_price>&tn=DSP-<courseId>`.
   - Sheet stays open with **"Open UPI App again"** + **"I've paid — enter UTR"** options.
4. **QR fallback** — if the user closes the sheet or returns to the page, show a darkened-background modal containing:
   - Generated QR (using `qrcode` npm lib) encoding the same UPI URI with the discounted amount.
   - UPI ID, payee, amount.
   - UTR input + Submit (existing `user_access` insert logic).

The current `upi-qr.png` static image is dropped in favour of dynamically-generated per-course QRs (correct amount embedded).

## 5. Bug Fixes — Course Management

- **Thumbnail upload:** the form currently uses a `url()` Zod validator on a free-text URL field, which is what's throwing "Invalid Input" when admins try to save without a perfectly-formed URL. Replace with a **file upload** (matches the Notice Board pattern), uploading to the existing public `course-thumbnails` bucket and storing the resulting public URL.
- **Edit Course:** the dialog already receives `course` props, but the `Dialog` is mounted at the parent level so prop changes mid-life-cycle don't reset state. I'll key the dialog on `course?.id ?? "new"` so the form re-initializes correctly when switching between Edit and New, and verify the update path writes back all fields including the new uploaded `thumbnail_url`.

## 6. UI/UX Polish — "The Vibe"

- **Glassmorphism utility classes** in `index.css`: `.glass` (white/8% bg + 12px blur + subtle border), `.glass-dark`. Apply to TopBar (when scrolled), BottomNav, hero-overlay cards, and the payment bottom sheet.
- **Color palette** stays Deep Blue + Orange (already on-brand with logo), refined for slightly more contrast on white surfaces.
- **Micro-interactions** added via Tailwind:
  - New keyframes: `fade-in`, `slide-in-up`, `scale-in`, `pulse-dot`, `glow`.
  - Utility classes: `.hover-lift` (translateY + shadow grow), `.hover-glow` (accent ring on hover), `.tap-scale` (active:scale-95 for buttons).
- Drop shadows tuned via existing `--shadow-card` / `--shadow-elevated` tokens.

---

## Database changes (single migration)

```sql
-- 1. Coupons
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_percent int check (discount_percent between 0 and 100),
  discount_amount numeric check (discount_amount >= 0),
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.coupons enable row level security;
create policy "auth read active coupons" on public.coupons for select to authenticated using (active = true);
create policy "admins manage coupons" on public.coupons for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

-- 2. Settings: add address + socials
alter table public.app_settings
  add column if not exists address text,
  add column if not exists map_embed_url text,
  add column if not exists youtube_url text default 'https://www.youtube.com/@devstudypoint1993',
  add column if not exists facebook_url text,
  add column if not exists instagram_url text;

-- 3. Hardcoded admin identities — update trigger
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  hardcoded_emails text[] := array['yrounsk@gmail.com','devsharma19932@gmail.com'];
  hardcoded_phones text[] := array['+919871868560','+918979073262'];
  is_admin boolean := false;
begin
  insert into public.profiles (id, email, full_name, phone)
  values (new.id, coalesce(new.email,''), coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email,''),'@',1)), new.phone);
  if (new.email is not null and lower(new.email) = any(hardcoded_emails))
     or (new.phone is not null and new.phone = any(hardcoded_phones)) then
    is_admin := true;
  end if;
  insert into public.user_roles(user_id, role)
    values (new.id, case when is_admin then 'admin'::app_role else 'student'::app_role end)
    on conflict do nothing;
  return new;
end $$;

-- 4. Backfill admin role for existing matches
insert into public.user_roles(user_id, role)
select id, 'admin'::app_role from auth.users
where lower(coalesce(email,'')) in ('yrounsk@gmail.com','devsharma19932@gmail.com')
   or phone in ('+919871868560','+918979073262')
on conflict do nothing;
```

## Edge function

`supabase/functions/get-latest-videos/index.ts` — accepts `?handle=devstudypoint1993&limit=6`, resolves handle → channelId → uploads playlist → returns recent items. Uses `YOUTUBE_API_KEY` runtime secret. `verify_jwt = true`.

## Files to add / change

**New**
- `src/components/HamburgerDrawer.tsx`
- `src/components/PhoneAuthForm.tsx`
- `src/components/YouTubeLatest.tsx`
- `src/components/PaymentBottomSheet.tsx`
- `src/components/QrPaymentModal.tsx`
- `src/pages/Checkout.tsx` (route `/courses/:id/checkout`)
- `supabase/functions/get-latest-videos/index.ts`
- One DB migration (above)

**Modified**
- `src/components/TopBar.tsx` — white bg, larger logo, hamburger
- `src/pages/Auth.tsx` — phone tab + duplicate-email handling + tab switching
- `src/pages/Home.tsx` — YouTube / About / Map / Socials sections + footer
- `src/pages/CourseDetail.tsx` — replace inline payment with "Enroll Now" → `/checkout`
- `src/pages/Admin.tsx` — thumbnail file upload, dialog re-key fix, settings form gets new fields
- `src/index.css` + `tailwind.config.ts` — glass utilities, animations
- `package.json` — add `qrcode` and `@types/qrcode`

## Manual steps you'll need to take

1. **SMS OTP provider** — open Backend → Auth → Providers → enable Phone, configure Twilio (or another SMS provider) with your account SID + auth token + sender. I'll link to it from the app when SMS sends fail.
2. **Confirm hardcoded admin phones in E.164 format** — I'm using `+91` country prefix. Confirm if any number is from a different country.
3. **YouTube API key** — I'll prompt to save `YOUTUBE_API_KEY` as a secret using the value you shared; the request will appear when I start building.
4. **Facebook page URL** — I'll search and pre-fill the most likely URL for "Dev Study Point"; you can correct it in Admin → Settings.

## Out of scope (call out so we agree)

- Admin coupon CRUD UI — DB + checkout validation only this round; admins seed coupons via Backend table editor for now (can add a UI in a follow-up).
- Per-user OAuth (Google sign-in) — not requested; can add later.
- Real payment gateway — still manual UTR verification.

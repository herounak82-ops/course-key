
# Coaching Center MVP — Implementation Plan

A mobile-first coaching platform where students browse courses, pay via UPI, submit a UTR, and unlock YouTube-hosted lessons after the Admin approves.

## What gets built

**Auth & roles**
- Lovable Cloud (Supabase) email/password auth
- Seed admin: first signup with the email you provide is auto-flagged `is_admin=true` via DB trigger
- Auto-create `profiles` row on signup

**Pages (mobile-first, bottom nav: Home · Courses · My Learning · Profile)**
1. **Auth** — Login / Signup screens
2. **Home (Notice Board)** — Feed of admin announcements (title, body, optional image, date). Admins see a "+ New Notice" button inline.
3. **Courses** — Grid/list of course cards with thumbnail, title, price tag
4. **Course Details**
   - Not paid → Course info + UPI section: auto-generated QR (from admin's UPI ID + course price + course title as note) + "I have paid — Enter UTR" form
   - Pending → Status banner "Awaiting verification"
   - Active → Embedded YouTube player + materials/description
5. **My Learning** — Only courses with `status='active'` for the user
6. **Profile** — Name, email, logout; if admin → link to Admin Dashboard
7. **Admin Dashboard** (route-guarded)
   - Tab 1: Pending Verifications (student email, course, UTR, Approve button)
   - Tab 2: Manage Courses (create/edit: title, description, price, YouTube ID, thumbnail)
   - Tab 3: Manage Notices (create/delete with optional image upload)
   - Tab 4: Settings (set UPI ID used for QR generation)

**Design**
- Palette: Deep Blue primary, White surfaces, Soft Grey accents — defined as HSL tokens in `index.css`
- Shadcn cards, buttons, forms, tabs, dialogs
- Sticky bottom nav on mobile, thumb-friendly 44px+ tap targets
- Toasts for submit/approve feedback

## Database (Lovable Cloud)

**Tables**
- `profiles` — `id (uuid, FK auth.users)`, `email`, `full_name`, `is_admin (bool)`
- `courses` — `id`, `title`, `description`, `price (numeric)`, `youtube_video_id`, `thumbnail_url`, `created_at`
- `user_access` — `id`, `user_id`, `course_id`, `status ('pending'|'active')`, `transaction_id`, `created_at`, unique(`user_id`,`course_id`)
- `notices` — `id`, `title`, `body`, `image_url`, `created_at`
- `app_settings` — single-row table holding `upi_id` (e.g. `teacher@okicici`)

**Storage buckets** (public): `notices`, `course-thumbnails`

**Security**
- Enable RLS on every table
- `has_role(uuid)` SECURITY DEFINER helper to avoid recursive RLS on `profiles`
- Policies:
  - `profiles`: users read/update own; admins read all
  - `courses`: anyone authenticated can read; only admins write
  - `user_access`: users read/insert their own rows (status forced to `pending`); only admins update status
  - `notices`: anyone authenticated reads; only admins write
  - `app_settings`: anyone authenticated reads; only admins update
- Trigger `on_auth_user_created` → inserts profile; if email matches the seeded admin email, sets `is_admin=true`

## Technical notes

- QR generation: client-side via `qrcode.react` rendering a UPI deep link `upi://pay?pa={upi_id}&pn=Coaching&am={price}&tn=Course-{id}&cu=INR`
- Route protection: `<RequireAuth>` and `<RequireAdmin>` wrappers using auth context + profile fetch
- Auth context uses `onAuthStateChange` set up before `getSession()` (no deadlocks, no localStorage role checks)
- Input validation with `zod` on UTR (12-digit numeric), notice title/body lengths, course fields
- YouTube embed via standard iframe with `youtube_video_id`
- React Query for all data fetching; invalidate on mutations

## Questions answered / assumptions
- QR generated from a single admin-set UPI ID (configurable in Admin → Settings)
- First signup matching the seeded admin email becomes admin — **I'll ask you for that email when we start building**
- Notices support text + optional image upload
- Approve-only flow; pending submissions stay until approved (admin can still see them queued)

## Out of scope (MVP)
- Real payment gateway, refunds, rejection/resubmit flow, push notifications, course progress tracking, quizzes

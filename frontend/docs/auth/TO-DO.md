### Remaining tasks to complete AUTH-PLAN

- **Apple OAuth ( LATER )**

  - [ ] Configure Apple provider in Supabase (Service ID, Key, Team ID, Redirect `/auth/callback`)
  - [ ] Re-enable Apple in `app/(auth)/login/page.tsx` providers array

- **Route protection**

  - [x] Implement `frontend/ui/src/middleware.ts` to protect `/(app)` and redirect unauthenticated users to `/login`
  - [x] Add matcher config to limit middleware to `/(app)(.*)`

- **JWT verification (HS256 with Supabase)**

  - [ ] Create `frontend/ui/src/lib/jwt.ts` with `jose` to verify Bearer tokens using `SUPABASE_JWT_SECRET`
  - [ ] Add example API route `frontend/ui/src/app/api/protected/route.ts` that checks `Authorization: Bearer <token>` and returns 200 only if valid

- **Database (profiles + RLS)**

  - [ ] Create `public.profiles` table keyed by `auth.users.id`
  - [ ] Add RLS policies: user can read/update their own row
  - [ ] Add signup trigger to insert a default profile on new user

- **Environment & config**

  - [ ] Create `frontend/ui/.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`
  - [ ] In Supabase Auth settings: confirm `SITE_URL` and OAuth redirect URIs for local and prod

- **Deployment**

  - [ ] Add the same env vars to Vercel project settings
  - [ ] Verify production OAuth redirect: `https://your-domain.com/auth/callback`

- **QA**
  - [x] Email/password sign-in and sign-up flow redirects to `/dashboard`
  - [x] Google OAuth flow redirects to `/dashboard` (already working locally)
  - [ ] Apple OAuth flow redirects to `/dashboard`
  - [x] `/(app)` redirects unauthenticated users to `/login`
  - [ ] `/api/protected` rejects invalid/expired tokens and accepts valid Supabase JWTs

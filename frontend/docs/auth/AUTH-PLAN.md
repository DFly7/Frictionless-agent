## Landing + Auth Implementation Plan (Next.js App Router + Supabase)

### Auth stack

- **Next.js**: App Router, server actions, route handlers, `middleware.ts` for protection
- **Supabase Auth**: JWT sessions via cookies, OAuth providers: **Google** and **Apple**
- **Clients**: `@supabase/supabase-js` + `@supabase/ssr` (server and browser helpers)

### Decisions

- Use **App Router with server actions**
- Use **`@supabase/auth-ui-react`** for login UI
- **No magic links**; allow **email/password** and social (**Google** and **Apple**)
- On successful login, redirect to **`/dashboard`** (protected). Dashboard shows a hello message and a logout button

### Token strategy (JWS/JWT)

- Use Supabase session JWT (JWS-signed) stored in cookies for browser + SSR. Do not manually parse it for page access; let Supabase server client read cookies.
- For first‑party API calls or third‑party integrations, mint a short‑lived application JWT (JWS) signed with our key.
  - Library: `jose`
  - Algorithm: prefer asymmetric `RS256` (PEM keys). Fallback: `HS256` with shared secret.
  - Claims: `sub` (user.id), `email`, optional `role`, `iat`, `exp` (≤ 15m), `iss`, `aud`.
  - Mint on demand via `/api/token` for authenticated users; avoid localStorage; use in-memory when needed.
  - Verify on API routes using public key (or shared secret) with `jose` and additionally ensure the user still exists via Supabase if needed.

### Supabase project setup

- **Create project** and note:
  - **Project URL**
  - **anon** public key (client-side)
- **Auth providers**: enable Google and Apple in Supabase Auth settings
- **Redirect URIs** (add to Supabase and provider consoles):
  - Local: `http://localhost:3000/auth/callback`
  - Prod: `https://your-domain.com/auth/callback`
- **SITE_URL** in Supabase Auth settings must match production domain exactly

### Provider configuration

- **Apple (Sign in with Apple)**
  - Apple Developer account → create Service ID and Sign in with Apple key
  - Configure Redirect and Return URLs to `/auth/callback`
  - Provide in Supabase Apple provider settings: Team ID, Key ID, Services ID, Private Key (PEM)
- **Google**
  - Google Cloud project → OAuth consent screen (External)
  - Create Web OAuth client; add Authorized redirect URI `/auth/callback`
  - Provide Client ID and Client Secret in Supabase Google provider settings

### Next.js dependencies

- Required: `@supabase/supabase-js`, `@supabase/ssr`, `@supabase/auth-ui-react`, `@supabase/auth-ui-shared`, `jose`
- Optional: `zod`, `clsx`

```bash
npm install @supabase/supabase-js @supabase/ssr @supabase/auth-ui-react @supabase/auth-ui-shared jose
# optional
npm install zod clsx
```

### Environment variables (`.env.local`)

- `NEXT_PUBLIC_SUPABASE_URL=...`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
- (Server-only if needed) `SUPABASE_SERVICE_ROLE_KEY=...` — never expose to the browser

- JWS/JWT (choose one algorithm):
  - RS256: `JWT_PRIVATE_KEY` (PEM), `JWT_PUBLIC_KEY` (PEM), `JWT_ISSUER=your-app`, `JWT_AUDIENCE=your-app-audience`
  - HS256: `JWT_SECRET` (strong random), `JWT_ISSUER`, `JWT_AUDIENCE`

### Minimal file structure

- `lib/supabase/server.ts`: create server client from cookies for SSR/server actions/route handlers
- `lib/supabase/client.ts`: create browser client for client components
- `app/(marketing)/page.tsx`: public landing page
- `app/(auth)/login/page.tsx`: login UI (email/password + Google/Apple)
- `app/auth/callback/route.ts`: OAuth callback (exchange code → session → redirect)
- `app/(app)/dashboard/page.tsx`: protected page with hello message + logout button
- `middleware.ts`: gate `/(app)` routes based on session

- `lib/jwt.ts`: sign/verify helpers using `jose` (RS256 preferred; HS256 fallback)
- `app/api/token/route.ts`: POST route to mint short‑lived JWS for authenticated users
- `app/api/protected/route.ts`: verifies Bearer JWS and processes request (example)

### Core flows

- **Login (Auth UI)**
  - Use `@supabase/auth-ui-react` on `/login` with providers: `google`, `apple`; disable magic links; enable email/password
  - Configure OAuth `redirectTo` → `${origin}/auth/callback`
  - On success, user ends up at `/auth/callback` which exchanges code and then redirects to `/dashboard`
- **OAuth (Google/Apple)**
  - Initiated via Auth UI
  - Callback route: `supabase.auth.exchangeCodeForSession()` then `redirect('/dashboard')`
- **Sign out**
  - On `/dashboard`, call `supabase.auth.signOut()` then redirect to `/login`
- **Route protection**

  - `middleware.ts` reads session (via server client/cookies) and redirects unauthenticated users from `/(app)` to `/login`

- **Mint JWS for API use**

  - Authenticated client calls `POST /api/token` (no body). Server reads Supabase session (from cookies) and mints a JWS with: `sub=user.id`, `email`, optional `role`, `iat`, `exp` ≤ 15m, `iss`, `aud`
  - Response contains token; store only in memory if used by browser to call same‑origin APIs

- **Verify JWS on API routes**
  - API routes expecting machine or delegated access read `Authorization: Bearer <token>`
  - Verify with `jose` using public key (RS256) or shared secret (HS256), check `exp`, `nbf`, `iss`, `aud`
  - Optionally cross‑check user with Supabase (e.g., `supabase.auth.getUser`) for revocation/drift

### Database and security

- **Profiles table** (common pattern)
  - `public.profiles` keyed by `auth.users.id` (uuid)
  - Columns: display_name, avatar_url, etc.
  - RLS: users can read/update their own row; optional public-readable subset
  - Trigger: insert a profile row on new user signup
- **RLS + JWT**
  - Keep RLS enabled; rely on Supabase JWT claims
  - On the server, use Supabase client (reads auth cookies) instead of manual JWT parsing

### Deployment notes (Vercel)

- Add env vars to Vercel project
- Ensure OAuth redirect URI is `https://your-domain.com/auth/callback` in Supabase and provider consoles
- Set `SITE_URL` in Supabase to production domain

- Store JWT keys as environment variables. For RS256 PEMs, add as multi‑line secrets (Vercel supports literal multi‑line). Rotate keys periodically.
- Do not expose private key to the client. Only server route handlers (`/api/*`) and server actions can access it.

### Build order (checklist)

1. Create Supabase project; enable Google/Apple; set redirect URIs and `SITE_URL`
2. Add env vars locally; install dependencies
3. Implement `lib/supabase/server.ts` and `lib/supabase/client.ts`
4. Build landing page UI root `app/page.tsx`
5. Build `/login` using `@supabase/auth-ui-react` (email/password + Google + Apple; no magic links)
6. Implement `/auth/callback` code exchange + redirect to `/dashboard`
7. Add `middleware.ts` and a protected `/(app)/dashboard` (hello + logout)
8. Add `lib/jwt.ts` helpers and `/api/token` route (JWS minting)
9. Add an example `/api/protected` that verifies Bearer JWS
10. Create `profiles` table, RLS, and signup trigger
11. Test all flows locally; deploy; test with production URLs

### QA checklist

- Login page shows email/password and Google/Apple only (no magic link)
- Email/password sign in/up works and redirects to `/dashboard`
- Google/Apple OAuth flows complete and redirect to `/dashboard`
- Dashboard shows hello message; logout signs out and redirects to `/login`
- Protected routes redirect to `/login` when unauthenticated
- Profiles row is created on signup; RLS prevents cross-user access

- `/api/token` returns a valid JWS for authenticated users; token expires in ≤ 15m
- `/api/protected` rejects missing/expired/invalid tokens and accepts valid ones
- Clock skew tolerance tested (~60s); `iss` and `aud` must match expected values

### Notes

- Keep `SITE_URL` in Supabase exactly matching your production URL for OAuth

- Prefer RS256 (asymmetric) for JWS to allow verification without sharing the private key
- Never store JWS in localStorage. If needed in browser, keep in memory and refresh as needed

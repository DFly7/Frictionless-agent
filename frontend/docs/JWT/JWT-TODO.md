### JWT Implementation TODO

This document tracks the implementation of the JWT forwarding design: Next.js as a BFF forwards the Supabase access token to FastAPI, which strictly verifies it and queries Supabase with user impersonation to enforce RLS.

---

### Checklist

- [ ] Frontend envs: add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `BACKEND_BASE_URL`
- [ ] Confirm SSR Supabase server client can read `access_token` and propagate refreshed cookies (`src/lib/supabase/server.ts`)
- [ ] Add BFF API routes under `src/app/api/**/route.ts` that forward `Authorization: Bearer <token>`
- [ ] Optional: add a client fetch wrapper for BFF routes (`src/lib/bff.ts`)
- [ ] Backend scaffold: FastAPI app, deps (`fastapi`, `uvicorn`, `pyjwt[crypto]`, `cachetools`, `httpx`, `supabase`)
- [ ] Backend envs: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PROJECT_REF` (optional)
- [ ] Implement JWKS-based JWT verification with strict `iss`/`aud` and TTL cache
- [ ] Implement Supabase user impersonation: `postgrest.auth(<user_access_token>)`
- [ ] Add protected example route `/api/profile` that respects RLS
- [ ] Protect Next.js application routes via `src/middleware.ts`
- [ ] Implement auth UX (login/logout) in `/(auth)` routes
- [ ] Ensure token refresh propagation from SSR to browser on BFF calls
- [ ] Local dev: run FastAPI on `:8000`, Next.js on `:3000`, set CORS appropriately
- [ ] Production: HTTPS, private networking, health checks
- [ ] Tests: happy path, expired token, wrong issuer/audience, RLS isolation, logout, performance (JWKS caching)

---

### Execution Plan

- **Goal**: Use Next.js as a BFF to forward the Supabase access token to FastAPI, which strictly verifies it and queries Supabase with user impersonation to enforce RLS.

#### Milestone 1 — Wire up environment and base scaffolding

- **Frontend (`frontend/ui`)**

  - Add env in `.env.local`:
    - `NEXT_PUBLIC_SUPABASE_URL=...`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
    - `BACKEND_BASE_URL=http://localhost:8000`
  - Confirm Supabase SSR setup in `src/lib/supabase/server.ts` uses `createServerClient` and exposes a helper to read the current `access_token` from the session.
  - Plan API route paths for the BFF, e.g. `src/app/api/<resource>/route.ts`.

- **Backend (`backend/`)**
  - Create a small FastAPI app (e.g. `backend/app/main.py`) with dependency management (`poetry` or `pip`).
  - Dependencies: `fastapi`, `uvicorn`, `pyjwt[crypto]`, `cachetools`, `httpx`, `supabase`.
  - Add env in `.env`:
    - `SUPABASE_URL=...`
    - `SUPABASE_ANON_KEY=...`
    - `SUPABASE_PROJECT_REF=<xyz>` (optional)
  - Expose `/healthz` for readiness.

#### Milestone 2 — Next.js BFF: retrieve and forward Supabase JWT

- Create an auth-aware BFF route (example: `src/app/api/profile/route.ts`):
  - Use the server Supabase client to get session and extract `access_token`.
  - Forward the original token to FastAPI via `Authorization: Bearer <token>`.
  - Propagate any refreshed cookies that `@supabase/ssr` returns in the response headers.
  - Return FastAPI’s response as-is to the browser (incl. 401 passthrough).

```ts
// Example skeleton for a BFF route
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export async function GET(request: Request) {
  const { supabase, applyServerSessionCookies } =
    await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await fetch(`${process.env.BACKEND_BASE_URL}/api/profile`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const next = new NextResponse(res.body, {
    status: res.status,
    headers: res.headers,
  });
  applyServerSessionCookies(next);
  return next;
}
```

#### Milestone 3 — FastAPI: strict JWT verification with cached JWKS

- Security dependency: Extract bearer token, fetch/cached JWKS, verify with strict `iss` and `aud`, return payload or raise 401.
- Caching: Use `cachetools.TTLCache` to cache JWKS client for ~10 minutes.

```python
# Example skeleton for JWT verification
import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from cachetools import cached, TTLCache
import jwt

bearer = HTTPBearer(auto_error=False)

@cached(cache=TTLCache(maxsize=1, ttl=600))
def get_jwks_client():
    supabase_url = os.environ["SUPABASE_URL"].rstrip("/")
    jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
    return jwt.PyJWKClient(jwks_url)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    token = credentials.credentials
    jwks_client = get_jwks_client()
    signing_key = jwks_client.get_signing_key_from_jwt(token).key
    try:
        supabase_url = os.environ["SUPABASE_URL"].rstrip("/")
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            audience="authenticated",
            issuer=f"{supabase_url}/auth/v1",
        )
        return payload, token
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
```

#### Milestone 4 — FastAPI: Supabase queries with user impersonation

- Initialize Supabase client with anon key.
- Per-request: After verifying token, call `supabase.postgrest.auth(<token>)`.
- Perform queries that automatically respect RLS.

```python
# Example skeleton for protected route
import os
from fastapi import FastAPI, Depends
from supabase import create_client, Client
from .auth import verify_token

app = FastAPI()
supabase: Client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_ANON_KEY"])

@app.get("/api/profile")
def get_profile(auth = Depends(verify_token)):
    payload, token = auth
    supabase.postgrest.auth(token)
    resp = supabase.table("user_profiles").select("*").limit(1).execute()
    return resp.data
```

#### Milestone 5 — Auth UX and route protection in Next.js

- Protect app routes in `src/middleware.ts` to require auth on `/(app)` paths; redirect to `/(auth)/login` when no session.
- Login/logout: Ensure `src/app/(auth)/login/page.tsx` uses Supabase Auth and sets httpOnly cookies via `@supabase/ssr`.

#### Milestone 6 — Error handling and token refresh loop

- FastAPI returns 401 on expired/invalid tokens.
- BFF forwards 401 to client; `@supabase/ssr` auto-refreshes, rotates cookies, and the client retries.
- Ensure the BFF route applies any updated cookies to the `NextResponse` so the browser receives them.

#### Milestone 7 — Local dev and deployment

- Local
  - Run FastAPI on `:8000` and Next.js on `:3000`.
  - Set CORS in FastAPI appropriately or keep BFF-only calls server-to-server (preferred).
  - Ensure machine clock is accurate (JWT validation).
- Prod
  - Enforce HTTPS between BFF and FastAPI.
  - Prefer private networking between services.
  - Provide health checks and readiness probes.

#### Milestone 8 — Testing checklist

- Happy path: login → BFF → FastAPI verifies → RLS query → data returned.
- Expired token: confirm 401 → automatic refresh → retry succeeds.
- Wrong issuer/audience: tamper token or env → expect 401.
- RLS: confirm users cannot access each other’s rows.
- Logout: clear session → protected routes redirect to login.
- Performance: JWKS cached; no per-request JWKS fetch.

---

### File-by-file changes (concise)

- `frontend/ui/.env.local`: add `BACKEND_BASE_URL`
- `frontend/ui/src/lib/supabase/server.ts`: helper to read token + cookie propagation
- `frontend/ui/src/app/api/**/route.ts`: BFF endpoints that forward `Authorization` header
- `frontend/ui/src/middleware.ts`: protect app routes
- `backend/app/auth.py`: JWT verification with JWKS caching
- `backend/app/main.py`: FastAPI app + protected routes + Supabase client
- `backend/pyproject.toml` or `backend/requirements.txt`: add dependencies

---

### Security notes

- Strict claim checks: exact `iss` = `<supabase-url>/auth/v1`, `aud` = `authenticated` (or custom).
- Do not use service role on backend for user queries; only anon key + user token impersonation.
- Short JWKS TTL (~10 min) and handle key rotation gracefully.
- Do not expose tokens to the browser beyond Supabase’s managed cookies.

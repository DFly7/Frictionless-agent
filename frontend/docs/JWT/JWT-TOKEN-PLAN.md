# JWT Authentication & Backend Interaction Plan

This document outlines the end-to-end authentication strategy for an application using Next.js as a Backend-for-Frontend (BFF), FastAPI as a backend API, and Supabase for authentication and database services.

The core principle of this plan is to **forward the original Supabase JWT**, not mint a custom one. This approach leverages Supabase's robust security and seamlessly integrates with its Row Level Security (RLS) policies.

---

## Authentication Stack

- **Frontend & BFF**: Next.js with App Router
- **Backend API**: FastAPI (Python)
- **Auth Provider & Database**: Supabase
- **JWT Specification**: RS256 (asymmetric) issued by Supabase
- **Libraries**: `@supabase/ssr` (Next.js), `supabase-py` (FastAPI), `PyJWT` & `cachetools` (FastAPI)

---

## Step-by-Step Authentication Flow

### 1. Frontend Authentication (Next.js)

- **Action**: Implement user authentication (login, signup, logout) using the official `@supabase/ssr` library.
- **Mechanism**: Supabase Auth handles issuing a secure, short-lived **access token** (JWT) and a long-lived **refresh token**. The library manages this session securely using `httpOnly` cookies.
- **Goal**: The frontend's responsibility is to get the user securely logged in and maintain their session within the browser.

### 2. API Communication (Next.js to FastAPI)

- **Action**: When the frontend application needs data from the backend, it will call an internal Next.js API route (the BFF).
- **Mechanism**: Inside the Next.js API route, use the server-side Supabase client (`createSupabaseServerClient`) to retrieve the logged-in user's `access_token` from their session.
- **Goal**: Securely forward the original Supabase access token to the FastAPI backend. The Next.js API route will make a request to the FastAPI server, setting the `Authorization` header like this:
  ```
  Authorization: Bearer <supabase_access_token>
  ```

### 3. Backend Token Verification (FastAPI)

- **Action**: Create a reusable security dependency in FastAPI to protect endpoints.
- **Mechanism**: This dependency will extract the Bearer token and perform a series of strict validations.

- **Stricter Claim Validation (Refinement)**
  It is crucial to be specific when validating the token's claims to prevent tokens from other sources from being accepted.

  - **Issuer (`iss`)**: Must be validated to be **exactly** your Supabase project's auth URL (e.g., `https://<ref>.supabase.co/auth/v1`).
  - **Audience (`aud`)**: Must be validated to be `'authenticated'` (the default) or your configured custom audience.

  ```python
  # In your FastAPI dependency
  import jwt

  # ... fetch public_key from JWKS ...

  # Be specific with validation!
  payload = jwt.decode(
      token,
      public_key,
      algorithms=["RS256"],
      audience="authenticated",  # or your custom audience
      issuer=f"https://<your-project-ref>.supabase.co/auth/v1"
  )
  ```

- **JWKS Caching Strategy (Implementation Detail)**
  To avoid fetching Supabase's public keys on every request, the JWKS response must be cached. The `cachetools` library is ideal for this.

  ```python
  from cachetools import cached, TTLCache
  import jwt

  # Cache the JWKS for 10 minutes.
  # The cache key is the jwks_url, so if it ever changes, it will re-fetch.
  @cached(cache=TTLCache(maxsize=1, ttl=600))
  def get_jwks_client(jwks_url: str):
      return jwt.PyJWKClient(jwks_url)

  # In your dependency:
  # ...
  jwks_url = "https://<ref>.supabase.co/auth/v1/.well-known/jwks.json"
  jwks_client = get_jwks_client(jwks_url)
  signing_key = jwks_client.get_signing_key_from_jwt(token)
  public_key = signing_key.key
  # ... continue with decode and validation
  ```

### 4. Backend Database Interaction (FastAPI)

- **Action**: After the token is successfully verified, use the validated token to perform database operations.
- **Mechanism**: Initialize the `supabase-py` client. For every query, pass the user's access token to **impersonate the user**.

  ```python
  # Example in FastAPI
  from supabase import create_client, Client

  # After token is verified...
  supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
  supabase.postgrest.auth(verified_token)

  # This query now respects RLS policies for the user
  response = supabase.table('user_profiles').select("*").execute()
  ```

- **Goal**: All database queries from the backend are executed **on behalf of the user**, which correctly and automatically enforces all of your Row Level Security (RLS) policies.

---

## Security & Implementation Notes

- **Token Expiration & Refresh Flow**: The `@supabase/ssr` library on the Next.js frontend handles token refreshes. The flow should be:

  1. FastAPI receives an expired token from the Next.js BFF and correctly returns a `401 Unauthorized` error.
  2. The Next.js BFF forwards this `401` response to the original browser client.
  3. The client-side part of `@supabase/ssr` intercepts the `401`, automatically uses the refresh token to get a new access token, and retries the original request. This retry loop is the intended behavior.

- **Inter-Service Network Security**: Communication between the Next.js BFF and the FastAPI backend must be secured.

  - At a minimum, ensure all traffic is over **HTTPS**.
  - Ideally, deploy both services within a **private network** (e.g., a VPC, VNet, or Docker network) so they do not expose traffic to the public internet.

- **Environment Variables**: Your FastAPI backend will only need your public Supabase URL and `anon` key to construct the JWKS URI. It **does not need** any private keys or service roles for this authentication flow, which enhances security.

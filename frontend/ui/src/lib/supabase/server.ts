// Server Supabase client factory for use in route handlers, server actions, SSR
// lib/supabase/server.ts

// lib/supabase/server.ts

// lib/supabase/server.ts

import { type CookieOptions, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Make the function async
export async function createSupabaseServerClient() {
  // Await the cookies() call
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            console.log('setAll method was called from a Server Component.')
          }
        },
      },
    }
  )
}
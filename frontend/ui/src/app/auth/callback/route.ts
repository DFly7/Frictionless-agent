// Route handler: exchange OAuth code for Supabase session, then redirect to /dashboard
// app/auth/callback/route.ts

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard"; // Optional redirect path

  // Use your tunnel URL as the base for redirects
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://smoothstudy.ai";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${baseUrl}${next}`);
    }
  }

  // Redirect to error page - use baseUrl so we never send users to 0.0.0.0
  return NextResponse.redirect(`${baseUrl}/login?error=auth-code-error`);
}
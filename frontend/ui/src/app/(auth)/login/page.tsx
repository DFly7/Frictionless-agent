
// Minimalist auth screen using @supabase/auth-ui-react (email/password + Google + Apple)
"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared"; // Corrected import
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const redirectTo = `${
    typeof window !== "undefined" ? window.location.origin : ""
  }/auth/callback`;
  const router = useRouter();

  // Redirect to /dashboard once signed in (email/password or OAuth finishes)
  useEffect(() => {
    // If already signed in, go straight to dashboard
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") router.replace("/dashboard");
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router, supabase]);

  return (
    <main className="min-h-screen surface">
      <header className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-blue-600 shadow-sm" />
          <span className="text-slate-900 font-semibold">SmoothStudy</span>
        </div>
        <a href="/" className="text-sm text-slate-600 hover:text-slate-900">Back to site</a>
      </header>
      <div className="px-6 py-10">
        <div className="w-full max-w-md mx-auto card p-6 md:p-8">
          <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-600">Sign in to continue</p>
          <div className="mt-6">
            <Auth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              providers={["google"]}
              onlyThirdPartyProviders={false}
              redirectTo={redirectTo}
              view="sign_in"
              localization={{ variables: { sign_in: { email_label: "Email" } } }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

export default function LoginPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const redirectTo = `${
    typeof window !== "undefined" ? window.location.origin : ""
  }/auth/callback`;
  const router = useRouter();

  useEffect(() => {
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
    <main className="min-h-screen bg-background grain">
      <header className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <MessageSquare className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-normal text-foreground">
            SmoothStudy.AI
          </span>
        </Link>
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Back to site
        </Link>
      </header>

      <div className="px-6 py-12 md:py-16">
        <div className="w-full max-w-md mx-auto">
          <div className="card p-8 md:p-10 border border-border/60 shadow-lg">
            <h1 className="font-display text-2xl md:text-3xl font-normal text-foreground">
              Let&apos;s get you started with SmoothStudy.AI.
            </h1>
            <p className="mt-2 text-muted-foreground">
              Your study partner gets smarter the more you share.
            </p>
            <div className="mt-8">
              <Auth
                supabaseClient={supabase}
                appearance={{
                  theme: ThemeSupa,
                  variables: {
                    default: {
                      colors: {
                        brand: "var(--primary)",
                        brandAccent: "#0d9488",
                        brandButtonText: "white",
                        inputBackground: "var(--background)",
                        inputBorder: "var(--border)",
                        inputText: "var(--foreground)",
                        inputPlaceholder: "var(--muted-foreground)",
                      },
                    },
                  },
                }}
                providers={["google"]}
                onlyThirdPartyProviders={false}
                redirectTo={redirectTo}
                view="sign_in"
                localization={{
                  variables: {
                    sign_in: {
                      email_label: "Email",
                      password_label: "Password",
                    },
                  },
                }}
              />
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            No credit card required. SmoothStudy.AI is free to start.
          </p>
        </div>
      </div>
    </main>
  );
}

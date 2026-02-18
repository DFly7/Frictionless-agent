"use client";

// Protected dashboard: shows hello message and Logout button; requires authenticated session
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getUser().then(({ data }) => {
      const e = data.user?.email ?? null;
      if (isMounted) setEmail(e);
      if (!e) router.replace("/login");
    });
    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold">Welcome{email ? `, ${email}` : ""}</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">You are signed in.</p>
        <button
          onClick={handleLogout}
          className="mt-6 inline-flex items-center justify-center rounded-md border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Logout
        </button>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { posthogIdentify, posthogReset } from "@/lib/posthog-user";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase.auth.getUser().then((result) => {
      if (!mounted) return;
      const user = result.data.user;
      setEmail(user?.email ?? null);
      if (user?.id) posthogIdentify(user.id, { email: user.email });
    }).catch(() => {
      if (!mounted) return;
      setEmail(null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user;
      setEmail(user?.email ?? null);
      if (user?.id) posthogIdentify(user.id, { email: user.email });
      else if (event === "SIGNED_OUT") posthogReset();
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const onSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    posthogReset();
    router.push("/auth");
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-2xl bg-black/70 border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9">
              <div className="absolute -inset-1 bg-gradient-to-br from-gold to-purple rounded-xl opacity-0 blur-md group-hover:opacity-50 transition-opacity duration-500" />
              <div className="relative w-full h-full bg-gradient-to-br from-gold to-purple rounded-xl flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white drop-shadow-lg transition-transform duration-300 group-hover:scale-110"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              headbop
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <NavLink href="/" active={pathname === "/"}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create
            </NavLink>
            <NavLink href="/library" active={pathname === "/library"}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Library
            </NavLink>
            {email ? (
              <>
                <span className="hidden sm:inline text-xs text-white/35 px-2">
                  {email}
                </span>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 text-white/50 hover:text-white cursor-pointer"
                >
                  Sign out
                </button>
              </>
            ) : (
              <NavLink href="/auth" active={pathname === "/auth"}>
                Sign in
              </NavLink>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
        active ? "text-white" : "text-white/50 hover:text-white"
      }`}
    >
      {active && (
        <span className="absolute inset-0 rounded-lg bg-white/[0.06]" />
      )}
      <span className="relative flex items-center gap-1.5">{children}</span>
    </Link>
  );
}

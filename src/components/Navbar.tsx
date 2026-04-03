"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { posthogIdentify, posthogReset } from "@/lib/posthog-user";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { LogoMark } from "@/components/LogoMark";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [subStatus, setSubStatus] = useState<string | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [canManageBilling, setCanManageBilling] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileOpen) return;
    const onDown = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [profileOpen]);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase.auth.getUser().then((result) => {
      if (!mounted) return;
      const user = result.data.user;
      setEmail(user?.email ?? null);
      setUserId(user?.id ?? null);
      if (user?.id) posthogIdentify(user.id, { email: user.email });
    }).catch(() => {
      if (!mounted) return;
      setEmail(null);
      setUserId(null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user;
      setEmail(user?.email ?? null);
      setUserId(user?.id ?? null);
      if (user?.id) posthogIdentify(user.id, { email: user.email });
      else if (event === "SIGNED_OUT") posthogReset();
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!userId) {
      setSubStatus(null);
      setCanManageBilling(false);
      return;
    }
    let cancelled = false;
    setSubLoading(true);
    fetch("/api/billing/status", { credentials: "same-origin" })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Failed");
        }
        return await res.json();
      })
      .then((j) => {
        if (cancelled) return;
        const status: string | null = j?.status ?? null;
        setSubStatus(status);
        setCanManageBilling(Boolean(j?.canManageBilling));
      })
      .catch(() => {
        if (cancelled) return;
        setSubStatus(null);
        setCanManageBilling(false);
      })
      .finally(() => {
        if (!cancelled) setSubLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const onSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    posthogReset();
    router.push("/auth");
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#f7f5ef]/85 border-b border-stone-300/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="transition-transform duration-300 group-hover:scale-105">
              <LogoMark />
            </div>
            <span className="text-xl font-bold tracking-tight text-stone-900">
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
                <div className="flex items-center gap-2 pr-0.5">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-stone-300/80 bg-white/50 text-[10px] text-stone-600 shrink-0"
                    title={
                      subStatus === "trialing"
                        ? "Your 7‑day free trial is active."
                        : subStatus === "active"
                        ? "Your subscription is active."
                        : subStatus
                        ? `Subscription: ${subStatus}`
                        : "No subscription yet."
                    }
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        subLoading
                          ? "bg-stone-400 animate-pulse"
                          : subStatus === "active"
                          ? "bg-emerald-500"
                          : subStatus === "trialing"
                          ? "bg-gold"
                          : "bg-stone-300"
                      }`}
                    />
                    {subLoading
                      ? "Checking…"
                      : subStatus === "active"
                      ? "Active"
                      : subStatus === "trialing"
                      ? "Trial"
                      : subStatus
                      ? subStatus.replace(/_/g, " ")
                      : "No plan"}
                  </span>
                </div>

                <div className="relative shrink-0" ref={profileRef}>
                  <button
                    type="button"
                    aria-expanded={profileOpen}
                    aria-haspopup="menu"
                    onClick={() => setProfileOpen((o) => !o)}
                    className="inline-flex items-center gap-2 rounded-lg border border-stone-300/90 bg-white/60 px-3 py-2 text-sm font-medium text-stone-800 shadow-sm transition hover:bg-white hover:border-stone-400"
                  >
                    <svg
                      className="h-5 w-5 text-stone-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={1.75}
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                      />
                    </svg>
                    <span className="hidden sm:inline">Profile</span>
                    <svg
                      className={`h-4 w-4 text-stone-500 transition-transform ${profileOpen ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      aria-hidden
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {profileOpen ? (
                    <div
                      role="menu"
                      aria-orientation="vertical"
                      className="absolute right-0 z-[60] mt-2 w-[min(100vw-2rem,18rem)] rounded-xl border border-stone-200 bg-white py-2 shadow-lg ring-1 ring-black/5"
                    >
                      <div className="border-b border-stone-100 px-4 pb-3 pt-1">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400">
                          Signed in as
                        </p>
                        <p className="mt-1 break-all text-sm text-stone-900">{email}</p>
                      </div>
                      <div className="flex flex-col py-1">
                        {canManageBilling ? (
                          <button
                            type="button"
                            role="menuitem"
                            disabled={portalLoading}
                            onClick={async () => {
                              setPortalLoading(true);
                              setProfileOpen(false);
                              try {
                                const res = await fetch("/api/stripe/portal", {
                                  method: "POST",
                                  credentials: "same-origin",
                                });
                                const j = await res.json();
                                if (!res.ok) throw new Error(j?.error || "Could not open billing");
                                if (j?.url) window.location.href = j.url;
                                else throw new Error("No portal URL");
                              } catch {
                                setPortalLoading(false);
                              }
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-stone-800 transition hover:bg-stone-50 disabled:opacity-50"
                          >
                            {portalLoading ? "Opening…" : "Manage billing"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setProfileOpen(false);
                            void onSignOut();
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-stone-700 transition hover:bg-stone-50"
                        >
                          Sign out
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
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
        active ? "text-stone-900" : "text-stone-500 hover:text-stone-800"
      }`}
    >
      {active && (
        <span className="absolute inset-0 rounded-lg bg-white/70 border border-stone-200/80 shadow-sm" />
      )}
      <span className="relative flex items-center gap-1.5">{children}</span>
    </Link>
  );
}

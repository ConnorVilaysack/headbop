import posthog from "posthog-js";

const POSTHOG_KEY =
  process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_TOKEN;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

if (POSTHOG_KEY) {
  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: "identified_only",
      capture_pageview: false,
      capture_pageleave: true,
      persistence: "localStorage+cookie",
      defaults: "2026-01-30",
    });
    if (typeof window !== "undefined") {
      posthog.capture("$pageview", { $current_url: window.location.href });
    }
  } catch {
    /* instrumentation must not break the app */
  }
}

export function onRouterTransitionStart(url: string) {
  if (!POSTHOG_KEY || typeof window === "undefined") return;
  try {
    const fullUrl = url.startsWith("http")
      ? url
      : `${window.location.origin}${url.startsWith("/") ? url : `/${url}`}`;
    posthog.capture("$pageview", { $current_url: fullUrl });
  } catch {
    /* ignore */
  }
}

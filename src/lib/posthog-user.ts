import posthog from "posthog-js";

const POSTHOG_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_TOKEN
);

export function posthogIdentify(
  userId: string,
  props?: { email?: string | null }
): void {
  if (!POSTHOG_ENABLED) return;
  try {
    posthog.identify(userId, {
      ...(props?.email ? { email: props.email } : {}),
    });
  } catch {
    /* ignore */
  }
}

export function posthogReset(): void {
  if (!POSTHOG_ENABLED) return;
  try {
    posthog.reset();
  } catch {
    /* ignore */
  }
}

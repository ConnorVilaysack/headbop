import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import type { BillingCustomer } from "@/lib/billing-store";
import { getBillingCustomerByUserId } from "@/lib/billing-store";

/** Stripe statuses that grant access (lowercase). */
function isEntitledStatus(status: string | null | undefined): boolean {
  const s = status?.toLowerCase().trim();
  return s === "active" || s === "trialing";
}

/** True if trial_end is a future timestamp (ISO from DB). */
function hasActiveTrialWindow(trialEndIso: string | null | undefined): boolean {
  if (!trialEndIso) return false;
  const end = new Date(trialEndIso);
  return !Number.isNaN(end.getTime()) && end.getTime() > Date.now();
}

/**
 * Normalize for UI + access: Stripe sometimes leaves status as incomplete/past
 * while trial_end is set; Supabase may show a trial without a clean "trialing" string.
 */
function resolveEffectiveStatus(billing: BillingCustomer | null): string | null {
  if (!billing) return null;
  const raw = billing.subscriptionStatus?.trim() ?? "";
  const lower = raw.toLowerCase();

  if (lower === "active" || lower === "trialing") return lower;

  if (hasActiveTrialWindow(billing.trialEnd)) return "trialing";

  return raw.length > 0 ? raw : null;
}

function isEntitled(billing: BillingCustomer | null): boolean {
  if (!billing) return false;
  if (isEntitledStatus(billing.subscriptionStatus)) return true;
  if (hasActiveTrialWindow(billing.trialEnd)) return true;
  return false;
}

export async function GET(_request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ entitled: false }, { status: 401 });

    const billing = await getBillingCustomerByUserId(user.id);
    const status = resolveEffectiveStatus(billing);
    return NextResponse.json({
      entitled: isEntitled(billing),
      status,
      rawStatus: billing?.subscriptionStatus ?? null,
      trialEnd: billing?.trialEnd ?? null,
      canManageBilling: Boolean(billing?.stripeCustomerId),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ entitled: false, error: msg }, { status: 500 });
  }
}


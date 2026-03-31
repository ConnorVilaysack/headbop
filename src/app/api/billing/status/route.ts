import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getBillingCustomerByUserId } from "@/lib/billing-store";

function isEntitled(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

export async function GET(_request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ entitled: false }, { status: 401 });

    const billing = await getBillingCustomerByUserId(user.id);
    return NextResponse.json({
      entitled: isEntitled(billing?.subscriptionStatus),
      status: billing?.subscriptionStatus ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ entitled: false, error: msg }, { status: 500 });
  }
}


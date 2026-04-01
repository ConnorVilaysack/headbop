import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getBillingCustomerByUserId } from "@/lib/billing-store";
import { getStripe } from "@/lib/stripe";

export async function POST(_request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_BASE_URL" },
        { status: 500 }
      );
    }

    const billing = await getBillingCustomerByUserId(user.id);
    const customerId = billing?.stripeCustomerId;
    if (!customerId) {
      return NextResponse.json(
        { error: "No billing profile yet. Start checkout first." },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const returnUrl = `${baseUrl.replace(/\/$/, "")}/`;
    const configurationId = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID?.trim();

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
      ...(configurationId ? { configuration: configurationId } : {}),
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

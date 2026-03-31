import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getStripe, STRIPE_PRICE_ID } from "@/lib/stripe";
import { upsertBillingCustomer } from "@/lib/billing-store";

export async function POST(_request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_BASE_URL" },
        { status: 500 }
      );
    }

    const stripe = getStripe();

    // Create a customer per Supabase user to keep identity stable.
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });

    await upsertBillingCustomer({
      userId: user.id,
      stripeCustomerId: customer.id,
      priceId: STRIPE_PRICE_ID,
      subscriptionStatus: "incomplete",
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { supabase_user_id: user.id, price_id: STRIPE_PRICE_ID },
      },
      success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/billing/cancel`,
      client_reference_id: user.id,
      allow_promotion_codes: false,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


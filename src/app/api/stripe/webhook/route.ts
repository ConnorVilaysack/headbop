import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, STRIPE_PRICE_ID } from "@/lib/stripe";
import { upsertBillingCustomer } from "@/lib/billing-store";

export const runtime = "nodejs";

function toIso(ts: number | null | undefined): string | null {
  if (!ts) return null;
  return new Date(ts * 1000).toISOString();
}

function getUserIdFromSubscription(sub: Stripe.Subscription): string | null {
  const fromMeta = (sub.metadata?.supabase_user_id as string | undefined) ?? null;
  return fromMeta && fromMeta.length > 0 ? fromMeta : null;
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Webhook signature error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        // The subscription will be handled by subscription.updated, but we can backfill customer id.
        const session = event.data.object as Stripe.Checkout.Session;
        const userId =
          (session.client_reference_id as string | undefined) ??
          (session.metadata?.supabase_user_id as string | undefined);
        const customerId = (session.customer as string | null) ?? null;
        if (userId && customerId) {
          await upsertBillingCustomer({
            userId,
            stripeCustomerId: customerId,
            priceId: STRIPE_PRICE_ID,
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = getUserIdFromSubscription(sub);
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

        if (userId) {
          const status = sub.status;
          const priceId =
            sub.items.data[0]?.price?.id ?? (sub.metadata?.price_id as string | undefined);

          await upsertBillingCustomer({
            userId,
            stripeCustomerId: customerId ?? null,
            stripeSubscriptionId: sub.id,
            subscriptionStatus: status,
            priceId: priceId ?? null,
            trialEnd: toIso(sub.trial_end),
            currentPeriodEnd: null,
          });
        }
        break;
      }

      default:
        break;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Webhook handler error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}


import { createClient } from "@supabase/supabase-js";

type BillingRow = {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  price_id: string | null;
  trial_end: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

export type BillingCustomer = {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  priceId: string | null;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  }
  return createClient(url, secret, { auth: { persistSession: false } });
}

function toBilling(row: BillingRow): BillingCustomer {
  return {
    userId: row.user_id,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    subscriptionStatus: row.subscription_status,
    priceId: row.price_id,
    trialEnd: row.trial_end,
    currentPeriodEnd: row.current_period_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getBillingCustomerByUserId(
  userId: string
): Promise<BillingCustomer | null> {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("billing_customers")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toBilling(data as BillingRow) : null;
}

export async function upsertBillingCustomer(input: {
  userId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  priceId?: string | null;
  trialEnd?: string | null;
  currentPeriodEnd?: string | null;
}): Promise<void> {
  const supabase = adminClient();
  const patch: Record<string, unknown> = { user_id: input.userId };
  if ("stripeCustomerId" in input) patch.stripe_customer_id = input.stripeCustomerId;
  if ("stripeSubscriptionId" in input) patch.stripe_subscription_id = input.stripeSubscriptionId;
  if ("subscriptionStatus" in input) patch.subscription_status = input.subscriptionStatus;
  if ("priceId" in input) patch.price_id = input.priceId;
  if ("trialEnd" in input) patch.trial_end = input.trialEnd;
  if ("currentPeriodEnd" in input) patch.current_period_end = input.currentPeriodEnd;

  const { error } = await supabase.from("billing_customers").upsert(patch, {
    onConflict: "user_id",
  });
  if (error) throw new Error(error.message);
}


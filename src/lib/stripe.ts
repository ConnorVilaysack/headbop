import Stripe from "stripe";

export const STRIPE_PRICE_ID = "price_1TGv0JHH08BgDeTku4Ma9N1o";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, {
    apiVersion: "2026-03-25.dahlia",
    typescript: true,
  });
}


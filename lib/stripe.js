import Stripe from "stripe";

// Lazy singleton: only throws if something actually tries to use Stripe
// while STRIPE_SECRET_KEY is unset, not at import/build time. Server-only —
// never import this from a "use client" file.
let _stripe = null;

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured on the server.");
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  }
  return _stripe;
}

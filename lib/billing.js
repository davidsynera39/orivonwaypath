import { getStripe } from "./stripe";

// billingIsLive flips the whole module's behavior. With STRIPE_SECRET_KEY unset
// (local dev, or before launch) every function below falls back to directly
// editing the plan in the database — no money moves, nothing to configure.
// Once you set STRIPE_SECRET_KEY + STRIPE_PRICE_ID_PRO, the same function
// names start doing the real thing. Nothing outside this file changes.
export const billingIsLive = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID_PRO);

// Called from app/api/billing/route.js. Returns a redirectUrl the client
// should navigate to — either a real Stripe Checkout Session URL, or the
// settings page (stub path, upgrade already applied).
export async function startUpgrade({ supabase, userId, userEmail, origin }) {
  if (!billingIsLive) {
    await supabase.from("profiles").update({ plan: "pro" }).eq("id", userId);
    await supabase.from("subscriptions").update({ plan: "pro" }).eq("user_id", userId);
    return { redirectUrl: "/settings?upgraded=1" };
  }

  const stripe = getStripe();

  // Reuse an existing Stripe customer if we've already created one for this user.
  const { data: sub } = await supabase.from("subscriptions").select("stripe_customer_id").eq("user_id", userId).single();
  let customerId = sub?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: userEmail, metadata: { supabase_user_id: userId } });
    customerId = customer.id;
    await supabase.from("subscriptions").update({ stripe_customer_id: customerId }).eq("user_id", userId);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID_PRO, quantity: 1 }],
    success_url: `${origin}/settings?upgraded=1`,
    cancel_url: `${origin}/settings`,
    metadata: { supabase_user_id: userId },
    subscription_data: { metadata: { supabase_user_id: userId } },
  });

  return { redirectUrl: session.url };
}

// Called from app/api/billing/route.js for the "cancel" action. In live mode
// this cancels at period end rather than immediately, so the person keeps
// Pro access through what they already paid for.
export async function cancelPlan({ supabase, userId }) {
  if (!billingIsLive) {
    await supabase.from("profiles").update({ plan: "free" }).eq("id", userId);
    await supabase.from("subscriptions").update({ plan: "free" }).eq("user_id", userId);
    return { cancelsAtPeriodEnd: false };
  }

  const stripe = getStripe();
  const { data: sub } = await supabase.from("subscriptions").select("stripe_subscription_id").eq("user_id", userId).single();
  if (sub?.stripe_subscription_id) {
    await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });
    return { cancelsAtPeriodEnd: true };
  }
  // No active Stripe subscription on file — just clear local state.
  await supabase.from("profiles").update({ plan: "free" }).eq("id", userId);
  await supabase.from("subscriptions").update({ plan: "free" }).eq("user_id", userId);
  return { cancelsAtPeriodEnd: false };
}

// Opens the Stripe billing portal so the person can update their card,
// view invoices, or cancel themselves. Only meaningful in live mode.
export async function openBillingPortal({ supabase, userId, origin }) {
  if (!billingIsLive) {
    throw new Error("Billing portal is only available once Stripe is configured.");
  }
  const stripe = getStripe();
  const { data: sub } = await supabase.from("subscriptions").select("stripe_customer_id").eq("user_id", userId).single();
  if (!sub?.stripe_customer_id) {
    throw new Error("No billing account found for this user yet.");
  }
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${origin}/settings`,
  });
  return { redirectUrl: portalSession.url };
}
